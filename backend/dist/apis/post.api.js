"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = postApiRouter;
const express_1 = require("express");
const post_service_1 = require("../services/post.service");
const feedback_service_1 = require("../services/feedback.service");
const vote_service_1 = require("../services/vote.service");
const user_service_1 = require("../services/user.service");
const notification_service_1 = require("../services/notification.service");
const notes_model_1 = __importDefault(require("../schemas/notes.model"));
const router = (0, express_1.Router)();
function postApiRouter(io) {
    router.get("/:postID/metadata", async (req, res) => {
        try {
            const studentID = req.session["stdid"];
            const studentDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
            const postDocID = (await notes_model_1.default.findOne({ postID: req.params.postID }, { _id: 1 }))._id.toString();
        }
        catch (error) {
            console.error(error);
            res.json({ ok: false });
        }
    });
    router.get("/:postID/images", async (req, res) => {
        try {
            const postDocID = (await notes_model_1.default.findOne({ postID: req.params.postID }, { _id: 1 }))._id.toString();
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    router.get("/:postID/comments", async (req, res) => {
        try {
            const postDocID = (await notes_model_1.default.findOne({ postID: req.params.postID }, { _id: 1 }))._id.toString();
            const studentDocID = (await user_service_1.Convert.getDocumentID_studentid(req.session["stdid"])).toString();
            const response = await (0, feedback_service_1.getComments)({ noteDocID: postDocID, studentDocID });
            if (response.ok) {
                res.json({ ok: true, comments: response.comments });
            }
            else {
                res.json({ ok: false });
            }
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    router.put("/:postID/save", async (req, res) => {
        try {
            const postDocID = (await notes_model_1.default.findOne({ postID: req.params.postID }, { _id: 1 }))._id.toString();
            const action = req.query["action"];
            const studentDocID = (await user_service_1.Convert.getDocumentID_studentid(req.session["stdid"])).toString();
            if (action === 'save') {
                let response = await (0, post_service_1.addSavePost)({ studentDocID, noteDocID: postDocID });
                res.json({ ok: response.ok });
            }
            else {
                let response = await (0, post_service_1.deleteSavedPost)({ studentDocID, noteDocID: postDocID });
                res.json({ ok: response.ok });
            }
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    router.post("/:postID/feedbacks", async (req, res) => {
        try {
            const postID = req.params.postID;
            const postDocID = (await notes_model_1.default.findOne({ postID: req.params.postID }, { _id: 1 }))._id.toString();
            const studentID = req.session["stdid"];
            const feedbackContent = req.body.feedbackContent;
            const commenterDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
            const feedbackData = {
                noteDocID: postDocID,
                commenterDocID: commenterDocID,
                feedbackContents: feedbackContent
            };
            const response = await (0, feedback_service_1.addFeedback)(feedbackData);
            if (response.ok) {
                const { feedback } = response;
                const toStudentID = feedback["noteDocID"]["ownerDocID"]["studentID"];
                const fromStudentID = feedback["commenterDocID"]["studentID"];
                if (toStudentID !== fromStudentID) {
                    await (0, notification_service_1.NotificationSender)(io, {
                        ownerStudentID: toStudentID,
                        redirectTo: `/post/${postID}`
                    }).sendNotification({
                        content: `gave you a comment on "${feedback["noteDocID"]["title"]}". Check it out!`,
                        event: notification_service_1.NotificationEvent.NOTIF_COMMENT,
                        isInteraction: true,
                        fromUserSudentDocID: feedback["commenterDocID"]["_id"]
                    });
                }
                res.json({ ok: true, feedback: feedback });
            }
            else {
                res.json({ ok: false });
            }
        }
        catch (error) {
            console.error(error);
            res.json({ ok: false });
        }
    });
    router.post("/:postID/feedbacks/:feedbackID/vote", async (req, res) => {
        try {
            const postDocID = (await notes_model_1.default.findOne({ postID: req.params.postID }, { _id: 1 }))._id.toString();
            const feedbackID = req.params.feedbackID;
            const voterStudentDocID = await user_service_1.Convert.getDocumentID_studentid(req.session["stdid"]);
            const voteType = req.query["type"];
            if (voteType === "upvote") {
                const response = await (0, vote_service_1.addVote)({ voteType, noteDocID: postDocID, voterStudentDocID: voterStudentDocID }, "comment", feedbackID);
                res.json({ ok: response.ok });
            }
            else {
                const response = await (0, vote_service_1.deleteVote)({ noteDocID: postDocID, voterStudentDocID }, "comment", feedbackID);
                res.json({ ok: response.ok });
            }
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    router.post("/:postID/feedbacks/:feedbackID/replies", async (req, res) => {
        try {
            const postID = req.params.postID;
            const postDocID = (await notes_model_1.default.findOne({ postID: req.params.postID }, { _id: 1 }))._id.toString();
            const studentID = req.session["stdid"];
            const replyContent = req.body.replyContent;
            const parentFeedbackDocID = req.params.feedbackID;
            const replyToUsername = req.body.replyToUsername;
            const replierDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
            const replyData = {
                noteDocID: postDocID,
                feedbackContents: replyContent,
                commenterDocID: replierDocID,
                parentFeedbackDocID: parentFeedbackDocID
            };
            const response = await (0, feedback_service_1.addReply)(replyData);
            if (response.ok) {
                const { reply } = response;
                const toStudentID = await user_service_1.Convert.getStudentID_username(replyToUsername);
                const fromStudentID = reply["commenterDocID"]["studentID"];
                if (toStudentID !== fromStudentID) {
                    await (0, notification_service_1.NotificationSender)(io, {
                        ownerStudentID: toStudentID,
                        redirectTo: `/post/${postID}`
                    }).sendNotification({
                        content: `gave a reply on your comment on "${reply["noteDocID"]["title"]}". Check it out!`,
                        event: notification_service_1.NotificationEvent.NOTIF_COMMENT,
                        isInteraction: true,
                        fromUserSudentDocID: reply["commenterDocID"]["_id"]
                    });
                }
                res.json({ ok: true, reply: response.reply });
            }
            else {
                res.json({ ok: false });
            }
        }
        catch (error) {
            res.json({ ok: true });
        }
    });
    router.post("/:postID/vote", async (req, res) => {
        try {
            const postDocID = (await notes_model_1.default.findOne({ postID: req.params.postID }, { _id: 1 }))._id.toString();
            const action = req.query["action"];
            const voterStudentID = req.session["stdid"];
            const voterStudentDocID = (await user_service_1.Convert.getDocumentID_studentid(voterStudentID)).toString();
            const voteType = req.query["type"];
            if (!action) {
                let response = await (0, vote_service_1.addVote)({ voteType, noteDocID: postDocID, voterStudentDocID: voterStudentDocID }, "post");
                res.json({ ok: response.ok });
            }
            else {
                let response = await (0, vote_service_1.deleteVote)({ noteDocID: postDocID, voterStudentDocID }, "post");
                res.json({ ok: response.ok });
            }
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    router.get("/saved", async (req, res) => {
        try {
            const studentID = req.session["stdid"];
            const response = await (0, post_service_1.getSavedPosts)(studentID);
            if (response.ok) {
                res.json({ ok: true, posts: response.posts });
            }
            else {
                res.json({ ok: false });
            }
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    return router;
}
