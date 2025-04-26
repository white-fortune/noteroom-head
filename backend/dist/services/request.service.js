"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequest = getRequest;
exports.getRequests = getRequests;
exports.addRequest = addRequest;
exports.deleteRequest = deleteRequest;
const mongoose_1 = __importDefault(require("mongoose"));
const requests_model_1 = __importDefault(require("../schemas/requests.model"));
async function getRequest(requestID) {
    try {
        const request = await requests_model_1.default.findOne({ _id: requestID });
        const populatedRequestData = await request.populate([
            { path: 'senderDocID', select: 'studentID' },
        ]);
        return { ok: true, data: {
                receiverDocID: populatedRequestData["receiverDocID"]["_id"],
                senderStudentID: populatedRequestData["senderDocID"]["studentID"]
            } };
    }
    catch (error) {
        return { ok: false };
    }
}
async function getRequests(ownerDocID) {
    try {
        const requestData = await requests_model_1.default.aggregate([
            { $match: { receiverDocID: new mongoose_1.default.Types.ObjectId(ownerDocID) } },
            { $lookup: {
                    from: "students",
                    localField: "senderDocID",
                    foreignField: "_id",
                    as: "senderDocID"
                } },
            { $project: {
                    _id: 0,
                    recID: "$_id",
                    createdAt: 1,
                    message: 1,
                    senderDisplayName: {
                        $first: "$senderDocID.displayname"
                    }
                } }
        ]);
        return { ok: true, requests: requestData };
    }
    catch (error) {
        return { ok: false };
    }
}
async function addRequest(reqdata) {
    try {
        const requestDocument = await requests_model_1.default.create(reqdata);
        const populatedRequestData = await requestDocument.populate([
            { path: 'senderDocID', select: 'studentID username displayname profile_pic' },
            { path: 'receiverDocID', select: 'studentID username displayname profile_pic' }
        ]);
        const requestData = {
            recID: populatedRequestData["_id"].toString(),
            senderDisplayName: populatedRequestData["senderDocID"]["displayname"],
            createdAt: populatedRequestData["createdAt"].toString(),
            message: populatedRequestData["message"]
        };
        return { ok: true, data: {
                receiverStudentID: populatedRequestData["receiverDocID"]["studentID"],
                requestData: requestData
            } };
    }
    catch (error) {
        return { ok: false };
    }
}
async function deleteRequest(reqID) {
    try {
        let deleteResult = await requests_model_1.default.deleteOne({ _id: reqID });
        return { ok: deleteResult.deletedCount !== 0 };
    }
    catch (error) {
        return { ok: false };
    }
}
