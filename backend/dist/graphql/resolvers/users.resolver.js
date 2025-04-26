"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const students_model_1 = __importDefault(require("../../schemas/students.model"));
const notes_model_1 = __importDefault(require("../../schemas/notes.model"));
const badges_model_1 = __importDefault(require("../../schemas/badges.model"));
const user_service_1 = require("../../services/user.service");
const UserResolver = {
    User: {
        async owned_posts(parent) {
            try {
                const postDocIDs = (await students_model_1.default.findOne({ username: parent.username }, { owned_notes: 1 }))["owned_notes"];
                if (postDocIDs.length !== 0) {
                    const posts = await notes_model_1.default.find({ _id: { $in: postDocIDs } });
                    return posts;
                }
                else {
                    return [];
                }
            }
            catch (error) {
                return [];
            }
        },
        async saved_posts(parent) {
            try {
                const postDocIDs = (await students_model_1.default.findOne({ username: parent.username }, { saved_notes: 1 }))["saved_notes"];
                if (postDocIDs.length !== 0) {
                    const posts = await notes_model_1.default.find({ _id: { $in: postDocIDs } });
                    return posts;
                }
                else {
                    return [];
                }
            }
            catch (error) {
                return [];
            }
        },
        async badges(parent) {
            try {
                const badgeID = (await students_model_1.default.findOne({ username: parent.username }, { badges: 1 })).badges;
                const badges = await badges_model_1.default.find({ badgeID: badgeID[0] });
                return badges;
            }
            catch (error) {
                return [];
            }
        },
        async owner(parent, __, context) {
            const { req, res } = context;
            const userID = req.session["stdid"];
            const username = (await user_service_1.Convert.getUserName_studentid(userID)).toString();
            return parent.username === username;
        },
        async featuredNoteCount() {
            return 0;
        }
    }
};
exports.default = UserResolver;
