"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filesModel = exports.linksModel = exports.mcqsModel = exports.contentsModel = exports.PostType = void 0;
const mongoose_1 = require("mongoose");
var PostType;
(function (PostType) {
    PostType["CONTENT"] = "note";
    PostType["FILE"] = "file";
    PostType["LINK"] = "link";
    PostType["MCQ"] = "mcq";
})(PostType || (exports.PostType = PostType = {}));
const baseOptions = {
    discriminatorKey: 'postType',
    collection: 'posts'
};
const notesSchema = new mongoose_1.Schema({
    ownerDocID: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'students'
    },
    ownerUserName: {
        type: String
    },
    postID: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        default: null
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    feedbackCount: {
        type: Number,
        default: 0
    },
    upvoteCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    visibility: {
        type: String,
        default: "public"
    },
    completed: {
        type: Boolean,
        default: false
    },
    pinned: {
        type: Boolean,
        default: false
    }
}, baseOptions);
const notesModel = (0, mongoose_1.model)('posts', notesSchema);
const contentSchema = new mongoose_1.Schema({
    content: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        default: null
    }
});
const contentsModel = notesModel.discriminator(PostType.CONTENT, contentSchema);
exports.contentsModel = contentsModel;
const mcqsSchema = new mongoose_1.Schema({
    mcqs: [{
            _id: false,
            question: String,
            questionID: {
                type: String,
                required: true
            },
            options: {
                type: [{
                        _id: false,
                        optionType: String,
                        optionText: String,
                        optionID: {
                            type: String,
                            required: true
                        },
                        selectionCount: {
                            type: Number,
                            default: 0
                        }
                    }]
            },
            correctAnswer: [String]
        }]
});
mcqsSchema.pre("save", function (next) {
    const doc = this;
    doc.completed = true;
    next();
});
const mcqsModel = notesModel.discriminator(PostType.MCQ, mcqsSchema);
exports.mcqsModel = mcqsModel;
const linksSchema = new mongoose_1.Schema({
    links: [String]
});
linksSchema.pre("save", function (next) {
    const doc = this;
    doc.completed = true;
    next();
});
const linksModel = notesModel.discriminator(PostType.LINK, linksSchema);
exports.linksModel = linksModel;
const filesSchema = new mongoose_1.Schema({
    files: [
        {
            _id: false,
            name: String,
            mimeType: {
                type: String,
                enum: ["application/pdf"],
                default: "application/pdf"
            },
            storageUrl: {
                type: String,
                required: true
            }
        }
    ],
    desscription: {
        type: String,
        default: null
    }
});
const filesModel = notesModel.discriminator(PostType.FILE, filesSchema);
exports.filesModel = filesModel;
exports.default = notesModel;
