"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const notesSchema = new mongoose_1.Schema({
    ownerDocID: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'students'
    },
    title: {
        type: String,
        default: null
    },
    postType: {
        type: String,
        default: 'note'
    },
    content: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        default: ''
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
    type_: {
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
});
const notesModel = (0, mongoose_1.model)('notes', notesSchema);
exports.default = notesModel;
