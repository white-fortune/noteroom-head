"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPost = addPost;
exports.getPosts = getPosts;
exports.getSinglePost = getSinglePost;
exports.addSavePost = addSavePost;
exports.deleteSavedPost = deleteSavedPost;
exports.getSavedPosts = getSavedPosts;
exports.searchPosts = searchPosts;
const notes_1 = __importDefault(require("../../schemas/notes"));
const students_1 = __importDefault(require("../../schemas/students"));
const mongoose_1 = __importDefault(require("mongoose"));
const voteService_1 = require("./voteService");
async function addPost(noteData) {
    let note = await notes_1.default.create(noteData);
    await students_1.default.findByIdAndUpdate(noteData.ownerDocID, { $push: { owned_notes: note._id } }, { upsert: true, new: true });
    return note;
}
async function isSaved({ studentDocID, noteDocID }) {
    let document = await students_1.default.find({ $and: [
            { _id: studentDocID },
            { saved_notes: { $in: [noteDocID] } }
        ]
    });
    return document.length !== 0 ? true : false;
}
async function getPosts(studentDocID, options) {
    let notes = await notes_1.default.aggregate([
        { $match: { completed: { $eq: true }, type_: "public" } },
        { $lookup: {
                from: 'students',
                localField: 'ownerDocID',
                foreignField: '_id',
                as: 'ownerDocID'
            } },
        { $addFields: {
                A: { $add: ["$feedbackCount", 1234567] },
                C: { $add: [
                        { $multiply: [{ $add: ["$upvoteCount", 10] }, 9876543] },
                        { $multiply: [{ $add: [{ $size: "$content" }, 1] }, 22695477] }
                    ] }
            } },
        { $addFields: {
                randomSort: {
                    $mod: [
                        { $add: [{ $multiply: ["$A", parseInt(options.seed)] }, "$C"] },
                        Math.pow(2, 32)
                    ]
                }
            } },
        { $unwind: {
                path: '$ownerDocID',
            } },
        { $project: {
                title: 1, description: 1,
                feedbackCount: 1, upvoteCount: 1,
                postType: 1, content: 1, randomSort: 1,
                createdAt: 1, pinned: 1,
                "ownerDocID._id": 1,
                "ownerDocID.profile_pic": 1,
                "ownerDocID.displayname": 1,
                "ownerDocID.studentID": 1,
                "ownerDocID.username": 1
            } },
        { $addFields: {
                isOwner: { $eq: ["$ownerDocID._id", new mongoose_1.default.Types.ObjectId(studentDocID)] }
            } },
        { $sort: { pinned: -1, randomSort: 1 } },
        { $skip: parseInt(options.skip) },
        { $limit: parseInt(options.limit) }
    ]);
    let extentedNotes = await Promise.all(notes.map(async (note) => {
        let isupvoted = await (0, voteService_1.isUpVoted)({ noteDocID: note["_id"].toString(), voterStudentDocID: studentDocID });
        let issaved = await isSaved({ noteDocID: note["_id"].toString(), studentDocID: studentDocID });
        return { ...note, isUpvoted: isupvoted, isSaved: issaved };
    }));
    return extentedNotes;
}
async function getSinglePost(noteDocID, studentDocID, options) {
    try {
        if (!options.images) {
            let notes = await notes_1.default.aggregate([
                { $match: { _id: new mongoose_1.default.Types.ObjectId(noteDocID) } },
                { $lookup: {
                        from: 'students',
                        localField: 'ownerDocID',
                        foreignField: '_id',
                        as: 'ownerDocID'
                    } },
                { $unwind: {
                        path: "$ownerDocID"
                    } },
                { $project: {
                        title: 1, description: 1,
                        feedbackCount: 1, upvoteCount: 1,
                        postType: 1, content: 1, randomSort: 1,
                        createdAt: 1, pinned: 1,
                        "ownerDocID._id": 1,
                        "ownerDocID.profile_pic": 1,
                        "ownerDocID.displayname": 1,
                        "ownerDocID.studentID": 1,
                        "ownerDocID.username": 1
                    } },
                { $addFields: {
                        isOwner: { $eq: ["$ownerDocID._id", new mongoose_1.default.Types.ObjectId(studentDocID)] }
                    } }
            ]);
            if (!notes.length) {
                return { ok: false };
            }
            let note = notes[0];
            let isUpvoted = await (0, voteService_1.isUpVoted)({ noteDocID, voterStudentDocID: studentDocID });
            let _isSaved = await isSaved({ studentDocID, noteDocID });
            return { ok: true, noteData: { ...note, isUpvoted, isSaved: _isSaved } };
        }
        else {
            let images = (await notes_1.default.findById(noteDocID, { content: 1 })).content;
            return { ok: true, images: images };
        }
    }
    catch (error) {
        return { ok: false };
    }
}
async function addSavePost({ studentDocID, noteDocID }) {
    try {
        await students_1.default.updateOne({ _id: studentDocID }, { $addToSet: { saved_notes: noteDocID } }, { new: true });
        return { ok: true };
    }
    catch (error) {
        return { ok: false };
    }
}
async function deleteSavedPost({ studentDocID, noteDocID }) {
    try {
        await students_1.default.updateOne({ _id: studentDocID }, { $pull: { saved_notes: noteDocID } });
        return { ok: true };
    }
    catch (error) {
        return { ok: false };
    }
}
async function getSavedPosts(studentID) {
    try {
        let student = await students_1.default.findOne({ studentID: studentID }, { saved_notes: 1 });
        let postsIDs = student.saved_notes;
        let posts = await notes_1.default.aggregate([
            { $match: { _id: { $in: postsIDs } } },
            { $project: {
                    noteID: "$_id",
                    noteTitle: "$title",
                    noteThumbnail: { $first: '$content' },
                } }
        ]);
        return { ok: true, posts };
    }
    catch (error) {
        return { ok: false };
    }
}
async function searchPosts(searchTerm, options) {
    try {
        const regex = new RegExp(searchTerm.split(' ').map(word => `(${word})`).join('.*'), 'i');
        const posts = await notes_1.default.aggregate([
            { $match: { title: { $regex: regex }, type_: { $ne: "private" } } },
            { $project: {
                    postID: "$_id",
                    title: 1
                } }
        ]);
        return { ok: true, posts: posts };
    }
    catch (error) {
        return { ok: false };
    }
}
