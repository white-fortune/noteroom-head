"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const studentsSchema = new mongoose_1.Schema({
    profile_pic: {
        type: String,
        default: null
    },
    displayname: {
        type: String,
        validate: {
            validator: (displayname) => displayname !== "",
            message: "Displayname is not provided"
        }
    },
    email: {
        type: String,
        validate: [
            {
                validator: (email) => email != "",
                message: "Email is not provided"
            },
            {
                validator: (email) => email.includes("@"),
                message: `The email addess is not valid`
            },
        ],
        unique: true,
    },
    password: {
        type: mongoose_1.Schema.Types.Mixed,
        validate: {
            validator: (password) => password !== "",
            message: "Password is not provided"
        }
    },
    studentID: {
        type: String,
        required: true,
        immutable: true,
        unique: true
    },
    rollnumber: {
        type: String,
        default: "Not given"
    },
    collegesection: {
        type: String,
        default: "Not selected"
    },
    collegeyear: {
        type: String,
        default: "Not Selected"
    },
    authProvider: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        minLength: 0,
        maxLength: 300,
        default: "Just a student surviving on caffeine, last-minute deadlines, and the hope that 'Ctrl + Z' works in real life."
    },
    favouritesubject: {
        type: String,
        default: "Not selected"
    },
    notfavsubject: {
        type: String,
        default: "Not selected"
    },
    group: {
        type: String,
        default: "Not given"
    },
    username: {
        type: String,
        unique: true,
        required: true
    },
    visibility: {
        type: String,
        default: "public"
    },
    owned_notes: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'posts',
        default: []
    },
    owned_posts: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'posts',
        default: []
    },
    saved_notes: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'posts',
        default: []
    },
    featured_notes: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'posts',
        default: []
    },
    downloaded_notes: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'posts',
        default: []
    },
    badges: {
        type: [Number],
        default: [0],
        unique: false
    },
    district: {
        type: String,
        default: ""
    },
    collegeID: {
        type: mongoose_1.Schema.Types.Mixed,
        default: "Not Given",
    },
    onboarded: {
        type: Boolean,
        default: false
    }
});
const studentsModel = (0, mongoose_1.model)('students', studentsSchema);
exports.default = studentsModel;
