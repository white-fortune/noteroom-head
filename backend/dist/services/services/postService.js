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
exports.addPost = addPost;
exports.deletePost = deletePost;
exports.getPosts = getPosts;
exports.getSinglePost = getSinglePost;
exports.addSavePost = addSavePost;
exports.deleteSavedPost = deleteSavedPost;
exports.getSavedPosts = getSavedPosts;
exports.searchPosts = searchPosts;
const notes_1 = __importStar(require("../../schemas/notes"));
const students_1 = __importDefault(require("../../schemas/students"));
const mongoose_1 = __importDefault(require("mongoose"));
const voteService_1 = require("./voteService");
const notes_2 = require("../../schemas/notes");
const firebaseService_1 = require("./firebaseService");
async function addPost(postData, postType) {
    try {
        let post = null;
        if (postType === notes_2.PostType.CONTENT) {
            post = await notes_1.contentsModel.create(postData);
        }
        else if (postType === notes_2.PostType.MCQ) {
            post = await notes_1.mcqsModel.create(postData);
        }
        else if (postType === notes_2.PostType.LINK) {
            post = await notes_1.linksModel.create(postData);
        }
        else if (postType === notes_2.PostType.FILE) {
            post = await notes_1.filesModel.create(postData);
        }
        if (post) {
            await students_1.default.findByIdAndUpdate(postData.ownerDocID, { $push: { owned_notes: post._id } }, { upsert: true, new: true });
            return { ok: true, postID: post._id };
        }
        else {
            return { ok: false };
        }
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
async function deletePost(postID, postType) {
    try {
        if (postType === notes_2.PostType.CONTENT || postType === notes_2.PostType.FILE) {
            await notes_1.default.deleteOne({ postID: postID });
            const fileDeleteResponse = await (0, firebaseService_1.deleteFile)(postID);
            return { ok: fileDeleteResponse.ok, code: !fileDeleteResponse.ok ? "FILE_DELETE_FAIL" : null };
        }
    }
    catch (error) {
        return { ok: false, error: error };
    }
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
        { $match: { completed: { $eq: true }, visibility: "public", postType: notes_2.PostType.CONTENT } },
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
                createdAt: 1, pinned: 1, postID: 1,
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
                        createdAt: 1, pinned: 1, postID: 1,
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
            let post = (await notes_1.default.findById(noteDocID))?.toObject();
            if (post) {
                if (post["content"] && post["content"].length !== 0) {
                    return { ok: true, images: post["content"] };
                }
                else {
                    return { ok: true, images: [] };
                }
            }
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
                    noteID: "$postID",
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
                    postID: 1,
                    title: 1
                } }
        ]);
        return { ok: true, posts: posts };
    }
    catch (error) {
        return { ok: false };
    }
}
