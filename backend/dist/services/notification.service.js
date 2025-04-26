"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationEvent = void 0;
exports.NotificationSender = NotificationSender;
exports.getNotifications = getNotifications;
exports.deleteAllNoti = deleteAllNoti;
exports.readNoti = readNoti;
exports.deleteNoti = deleteNoti;
exports.addNoti = addNoti;
exports.addInteractionNoti = addInteractionNoti;
const notifications_model_1 = require("../schemas/notifications.model");
const server_1 = require("../server");
var NotificationEvent;
(function (NotificationEvent) {
    NotificationEvent["NOTIF_COMMENT"] = "notification-comment";
    NotificationEvent["NOTIF_REQUEST"] = "notification-request";
    NotificationEvent["NOTIF_REQUEST_ACCEPT"] = "notification-request-accept";
    NotificationEvent["NOTIF_REQUEST_DECLINE"] = "notification-request-decline";
})(NotificationEvent || (exports.NotificationEvent = NotificationEvent = {}));
function NotificationSender(io, options) {
    return {
        async sendNotification({ content, event, isInteraction, fromUserSudentDocID, additional }) {
            try {
                let ownerStudentID = options.ownerStudentID;
                let redirectTo = options.redirectTo || null;
                let baseDocument = {
                    notiType: event,
                    content: content,
                    redirectTo: redirectTo,
                    ownerStudentID: ownerStudentID
                };
                let notification_db = isInteraction ? { ...baseDocument, fromUserSudentDocID } : baseDocument;
                let notification_document = isInteraction ? await addInteractionNoti(notification_db) : await addNoti(notification_db);
                let notification_io = {
                    notiID: notification_document["_id"].toString(),
                    content: notification_db.content,
                    redirectTo: redirectTo,
                    isRead: false,
                    isInteraction: isInteraction,
                    notiType: event,
                    createdAt: notification_document["createdAt"],
                    fromUser: isInteraction ? notification_document["fromUserSudentDocID"] : null,
                    additional: additional || null
                };
                io.to(server_1.userSocketMap.get(ownerStudentID)).emit(event, notification_io);
                return { ok: true };
            }
            catch (error) {
                console.error(error);
                return { ok: false };
            }
        }
    };
}
async function getNotifications(ownerStudentID) {
    try {
        let notifications = await notifications_model_1.Notifs.aggregate([
            { $match: { ownerStudentID: ownerStudentID } },
            { $lookup: {
                    from: "students",
                    localField: "fromUserSudentDocID",
                    foreignField: "_id",
                    as: "fromUserSudentDocID"
                } },
            { $unwind: {
                    path: "$fromUserSudentDocID",
                    preserveNullAndEmptyArrays: true
                } },
            { $addFields: {
                    isInteraction: { $eq: ["$docType", "interaction"] },
                    fromUser: {
                        profile_pic: "$fromUserSudentDocID.profile_pic",
                        displayname: "$fromUserSudentDocID.displayname",
                        username: "$fromUserSudentDocID.username"
                    },
                } },
            { $project: {
                    _id: 0,
                    notiID: "$_id", title: 1, content: 1, isRead: 1, createdAt: 1, notiType: 1, isInteraction: 1,
                    fromUser: {
                        $cond: {
                            if: { $eq: [{ $size: { $objectToArray: "$fromUser" } }, 0] },
                            then: "$$REMOVE",
                            else: "$fromUser"
                        }
                    }
                } }
        ]);
        return { ok: true, notifications };
    }
    catch (error) {
        console.error(error);
        return { ok: false };
    }
}
async function deleteAllNoti(ownerStudentID) {
    try {
        let result = await notifications_model_1.Notifs.deleteMany({ ownerStudentID: ownerStudentID });
        return result.deletedCount !== 0;
    }
    catch (error) {
        return false;
    }
}
async function readNoti(notiID) {
    try {
        await notifications_model_1.Notifs.updateOne({ _id: notiID }, { $set: { isRead: true } });
        return { ok: true };
    }
    catch (error) {
        return { ok: false };
    }
}
async function deleteNoti(notiID) {
    await notifications_model_1.Notifs.deleteOne({ _id: notiID });
}
async function addNoti(notiData) {
    let data = await notifications_model_1.Notifs.create(notiData);
    return data;
}
async function addInteractionNoti(notiData) {
    let data = await notifications_model_1.InteractionNotifs.create(notiData);
    return data.populate('fromUserSudentDocID', 'displayname username profile_pic');
}
