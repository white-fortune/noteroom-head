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
const RootQueryResolver = {
    StringOrInt: types_scalar_1.default,
    Query: {
        async user(_, args) {
            const user = await students_model_1.default.findOne({ username: args.username });
            return user;
        }
    }
};
exports.default = (0, merge_1.mergeResolvers)([RootQueryResolver, users_resolver_1.default, posts_resolver_1.default]);
