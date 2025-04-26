"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUpvoted = isUpvoted;
exports.isCommentUpVoted = isCommentUpVoted;
exports.deleteVote = deleteVote;
exports.addVote = addVote;
const votes_model_1 = __importStar(require("../schemas/votes,model"));
const notes_model_1 = __importDefault(require("../schemas/notes.model"));
const comments_model_1 = require("../schemas/comments.model");
async function isUpvoted(postDocID, voterStudentDocID) {
    let upvote_doc = await votes_model_1.default.findOne({
        $and: [
            { docType: { $ne: 'feedback' } },
            { noteDocID: postDocID },
            { voterStudentDocID: voterStudentDocID }
        ]
    });
    return upvote_doc ? true : false;
}
async function isCommentUpVoted({ feedbackDocID, voterStudentDocID }) {
    let upvote_doc = await votes_model_1.CommentVotes.findOne({
        $and: [
            { docType: { $eq: 'feedback' } },
            { feedbackDocID: feedbackDocID },
            { voterStudentDocID: voterStudentDocID }
        ]
    });
    return upvote_doc ? true : false;
}
async function deleteVote({ noteDocID, voterStudentDocID }, on, feedbackDocID) {
    try {
        if (on === "post") {
            const deleteResult = await votes_model_1.default.deleteOne({ noteDocID, voterStudentDocID });
            if (deleteResult.deletedCount !== 0) {
                await notes_model_1.default.updateOne({ _id: noteDocID }, { $inc: { upvoteCount: -1 } });
                return { ok: true };
            }
            else {
                return { ok: false };
            }
        }
        else {
            const deleteResult = await votes_model_1.default.deleteOne({ noteDocID, voterStudentDocID, docType: "feedback" });
            if (deleteResult.deletedCount !== 0) {
                await comments_model_1.feedbacksModel.updateOne({ _id: feedbackDocID }, { $inc: { upvoteCount: -1 } });
                return { ok: true };
            }
            else {
                return { ok: false };
            }
        }
    }
    catch (error) {
        return { ok: false };
    }
}
async function addVote({ noteDocID, voterStudentDocID, voteType }, on, feedbackDocID) {
    try {
        if (on === "post") {
            const voteData = await votes_model_1.default.create({ noteDocID, voterStudentDocID, voteType });
            if (voteData) {
                await notes_model_1.default.findByIdAndUpdate(noteDocID, { $inc: { upvoteCount: 1 } });
                return { ok: true };
            }
            else {
                return { ok: false };
            }
        }
        else {
            const voteData = await votes_model_1.CommentVotes.create({ noteDocID, voterStudentDocID, voteType, feedbackDocID });
            if (voteData) {
                await comments_model_1.feedbacksModel.updateOne({ _id: feedbackDocID }, { $inc: { upvoteCount: 1 } });
                return { ok: true };
            }
            else {
                return { ok: false };
            }
        }
    }
    catch (error) {
        return { ok: false };
    }
}
