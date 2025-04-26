"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const merge_1 = require("@graphql-tools/merge");
const students_model_1 = __importDefault(require("../../schemas/students.model"));
const users_resolver_1 = __importDefault(require("./users.resolver"));
const posts_resolver_1 = __importDefault(require("./posts.resolver"));
const types_scalar_1 = __importDefault(require("../scalars/types.scalar"));
const notes_model_1 = __importDefault(require("../../schemas/notes.model"));
const RootQueryResolver = {
    StringOrInt: types_scalar_1.default,
    Query: {
        async user(_, args) {
            const user = await students_model_1.default.findOne({ username: args.username });
            return user;
        },
        async post(_, args) {
            const post = await notes_model_1.default.findOne({ postID: args.postID });
            return post;
        },
        async posts(_, args) {
            try {
                const limit = 7;
                const skip = (args.page - 1) * limit;
                const posts = await notes_model_1.default.find({}).skip(skip).limit(limit);
                return posts;
            }
            catch (error) {
                return null;
            }
        }
    }
};
exports.default = (0, merge_1.mergeResolvers)([RootQueryResolver, users_resolver_1.default, posts_resolver_1.default]);
