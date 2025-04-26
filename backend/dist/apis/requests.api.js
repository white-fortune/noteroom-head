"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = requestsApiRouter;
const express_1 = require("express");
const user_service_1 = require("../services/user.service");
const request_service_1 = require("../services/request.service");
const notification_service_1 = require("../services/notification.service");
const server_1 = require("../server");
const router = (0, express_1.Router)();
function requestsApiRouter(io) {
    router.post('/:requestID/accept', async (req, res) => {
        try {
            const requestID = req.params.requestID;
            const response = await (0, request_service_1.getRequest)(requestID);
            if (response.ok) {
                const { receiverDocID, senderStudentID } = response.data;
                await (0, notification_service_1.NotificationSender)(io, {
                    ownerStudentID: senderStudentID,
                    redirectTo: `/post/${req.body.postID}`
                }).sendNotification({
                    content: `have accepted your request and sent you a resource. Click to see`,
                    event: notification_service_1.NotificationEvent.NOTIF_REQUEST_ACCEPT,
                    isInteraction: true,
                    fromUserSudentDocID: receiverDocID
                });
                const deleteResponse = await (0, request_service_1.deleteRequest)(requestID);
                res.json({ ok: deleteResponse && true });
            }
            else {
                res.json({ ok: false, message: "Request cannot be accepted! Try again a bit later." });
            }
        }
        catch (error) {
            res.json({ ok: false, message: "Request cannot be accepted! Try again a bit later." });
        }
    });
    router.post('/:requestID/decline', async (req, res) => {
        try {
            const requestID = req.params.requestID;
            const message = req.body.message;
            const response = await (0, request_service_1.getRequest)(requestID);
            if (response.ok) {
                const { receiverDocID, senderStudentID } = response.data;
                await (0, notification_service_1.NotificationSender)(io, {
                    ownerStudentID: senderStudentID,
                }).sendNotification({
                    content: `have decliend your request saying "${message}"`,
                    event: notification_service_1.NotificationEvent.NOTIF_REQUEST_DECLINE,
                    isInteraction: true,
                    fromUserSudentDocID: receiverDocID
                });
                const deleteResponse = await (0, request_service_1.deleteRequest)(requestID);
                res.json({ ok: deleteResponse && true });
            }
            else {
                res.json({ ok: false, message: "Request cannot be delined! Try again a bit later." });
            }
        }
        catch (error) {
            res.json({ ok: false, message: "Request cannot be declined! Try again a bit later." });
        }
    });
    router.get("/", async (req, res) => {
        try {
            let studentID = req.session["stdid"];
            let studentDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
            let response = await (0, request_service_1.getRequests)(studentDocID);
            if (response.ok) {
                res.json({ ok: true, requests: response.requests });
            }
            else {
                res.json({ ok: false });
            }
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    router.post('/send', async (req, res) => {
        try {
            let senderStudentID = req.session["stdid"];
            let senderDocID = await user_service_1.Convert.getDocumentID_studentid(senderStudentID);
            let receiverUsername = req.body.receiverUsername;
            let receiverDocID = await user_service_1.Convert.getDocumentID_username(receiverUsername);
            if (senderDocID !== receiverDocID) {
                const requestData = {
                    senderDocID, receiverDocID,
                    message: req.body.message
                };
                const response = await (0, request_service_1.addRequest)(requestData);
                if (response.ok) {
                    const { requestData, receiverStudentID } = response.data;
                    io.to(server_1.userSocketMap.get(receiverStudentID)).emit('request-object', requestData);
                    await (0, notification_service_1.NotificationSender)(io, {
                        ownerStudentID: receiverStudentID,
                    }).sendNotification({
                        content: `have sent you a request`,
                        event: notification_service_1.NotificationEvent.NOTIF_REQUEST,
                        isInteraction: true,
                        fromUserSudentDocID: senderDocID
                    });
                    res.json({ ok: true });
                }
                else {
                    res.json({ ok: false, message: "Request can't be sent successfully!" });
                }
            }
            else {
                res.json({ ok: false, message: "You can't send a request to yourself! " });
            }
        }
        catch (error) {
        }
    });
    return router;
}
