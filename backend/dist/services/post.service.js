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
exports.isSaved = isSaved;
exports.getPosts = getPosts;
exports.getSinglePost = getSinglePost;
exports.addSavePost = addSavePost;
exports.deleteSavedPost = deleteSavedPost;
exports.getSavedPosts = getSavedPosts;
exports.searchPosts = searchPosts;
const notes_model_1 = __importStar(require("../schemas/notes.model"));
const students_model_1 = __importDefault(require("../schemas/students.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const vote_service_1 = require("./vote.service");
const notes_model_2 = require("../schemas/notes.model");
const firebase_service_1 = require("./firebase.service");
const user_service_1 = require("./user.service");
async function addPost(postData, postType) {
    try {
        let post = null;
        if (postType === notes_model_2.PostType.CONTENT) {
            post = await notes_model_1.contentsModel.create(postData);
        }
        else if (postType === notes_model_2.PostType.MCQ) {
            post = await notes_model_1.mcqsModel.create(postData);
        }
        else if (postType === notes_model_2.PostType.LINK) {
            post = await notes_model_1.linksModel.create(postData);
        }
        else if (postType === notes_model_2.PostType.FILE) {
            post = await notes_model_1.filesModel.create(postData);
        }
        if (post) {
            await students_model_1.default.findByIdAndUpdate(postData.ownerDocID, { $push: { owned_notes: post._id } }, { upsert: true, new: true });
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
        if (postType === notes_model_2.PostType.CONTENT || postType === notes_model_2.PostType.FILE) {
            await notes_model_1.default.deleteOne({ postID: postID });
            const fileDeleteResponse = await (0, firebase_service_1.deleteFile)(postID);
            return { ok: fileDeleteResponse.ok, code: !fileDeleteResponse.ok ? "FILE_DELETE_FAIL" : null };
        }
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
async function isSaved(userDocID, postDocID) {
    let document = await students_model_1.default.findOne({
        $and: [
            { _id: userDocID },
            { saved_notes: { $in: [postDocID] } }
        ]
    });
    return document ? true : false;
}
async function getPosts(studentDocID, options) {
    let notes = await notes_model_1.default.aggregate([
        { $match: { completed: { $eq: true }, visibility: "public", postType: notes_model_2.PostType.CONTENT } },
        {
            $lookup: {
                from: 'students',
                localField: 'ownerDocID',
                foreignField: '_id',
                as: 'ownerDocID'
            }
        },
        {
            $addFields: {
                A: { $add: ["$feedbackCount", 1234567] },
                C: {
                    $add: [
                        { $multiply: [{ $add: ["$upvoteCount", 10] }, 9876543] },
                        { $multiply: [{ $add: [{ $size: "$content" }, 1] }, 22695477] }
                    ]
                }
            }
        },
        {
            $addFields: {
                randomSort: {
                    $mod: [
                        { $add: [{ $multiply: ["$A", parseInt(options.seed)] }, "$C"] },
                        Math.pow(2, 32)
                    ]
                }
            }
        },
        {
            $unwind: {
                path: '$ownerDocID',
            }
        },
        {
            $project: {
                title: 1, description: 1,
                feedbackCount: 1, upvoteCount: 1,
                postType: 1, content: 1, randomSort: 1,
                createdAt: 1, pinned: 1, postID: 1,
                "ownerDocID._id": 1,
                "ownerDocID.profile_pic": 1,
                "ownerDocID.displayname": 1,
                "ownerDocID.studentID": 1,
                "ownerDocID.username": 1
            }
        },
        {
            $addFields: {
                isOwner: { $eq: ["$ownerDocID._id", new mongoose_1.default.Types.ObjectId(studentDocID)] }
            }
        },
        { $sort: { pinned: -1, randomSort: 1 } },
        { $skip: parseInt(options.skip) },
        { $limit: parseInt(options.limit) }
    ]);
    let extentedNotes = await Promise.all(notes.map(async (note) => {
        return { ...note, isUpvoted: true, isSaved: true };
    }));
    return extentedNotes;
}
async function getSinglePost(postID, studentID) {
    try {
        let post = await notes_model_1.default.aggregate([
            { $match: { postID: postID } },
            {
                $lookup: {
                    from: 'students',
                    localField: 'ownerDocID',
                    foreignField: '_id',
                    as: 'ownerDocID'
                }
            },
            {
                $unwind: {
                    path: "$ownerDocID"
                }
            },
            {
                $project: {
                    title: 1, description: 1,
                    feedbackCount: 1, upvoteCount: 1,
                    postType: 1, content: 1,
                    createdAt: 1, pinned: 1, postID: 1,
                    "ownerDocID._id": 1,
                    "ownerDocID.profile_pic": 1,
                    "ownerDocID.displayname": 1,
                    "ownerDocID.studentID": 1,
                    "ownerDocID.username": 1
                }
            },
            {
                $addFields: {
                    isOwner: { $eq: ["$ownerDocID.studentID", studentID] }
                }
            }
        ]);
        if (post.length === 0) {
            return { ok: false };
        }
        const postDocID = post[0]._id.toString();
        const userDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
        const isPostUpvoted = await (0, vote_service_1.isUpvoted)(postDocID, userDocID);
        return { ok: true, post: { ...post[0], isSaved: true, isUpvoted: isPostUpvoted } };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
async function addSavePost({ studentDocID, noteDocID }) {
    try {
        await students_model_1.default.updateOne({ _id: studentDocID }, { $addToSet: { saved_notes: noteDocID } }, { new: true });
        return { ok: true };
    }
    catch (error) {
        return { ok: false };
    }
}
async function deleteSavedPost({ studentDocID, noteDocID }) {
    try {
        await students_model_1.default.updateOne({ _id: studentDocID }, { $pull: { saved_notes: noteDocID } });
        return { ok: true };
    }
    catch (error) {
        return { ok: false };
    }
}
async function getSavedPosts(studentID) {
    try {
        let student = await students_model_1.default.findOne({ studentID: studentID }, { saved_notes: 1 });
        let postsIDs = student.saved_notes;
        let posts = await notes_model_1.default.aggregate([
            { $match: { _id: { $in: postsIDs } } },
            {
                $project: {
                    noteID: "$postID",
                    noteTitle: "$title",
                    noteThumbnail: { $first: '$content' },
                }
            }
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
        const posts = await notes_model_1.default.aggregate([
            { $match: { title: { $regex: regex }, type_: { $ne: "private" } } },
            {
                $project: {
                    postID: 1,
                    title: 1
                }
            }
        ]);
        return { ok: true, posts: posts };
    }
    catch (error) {
        return { ok: false };
    }
}
