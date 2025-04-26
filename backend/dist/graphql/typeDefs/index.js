"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const merge_1 = require("@graphql-tools/merge");
const users_typeDef_1 = __importDefault(require("./users.typeDef"));
const posts_typeDef_1 = __importDefault(require("./posts.typeDef"));
const RootQuery = `#graphql
    scalar StringOrInt
    
    type Query {
        user(username: String!): User
    }
`;
exports.default = (0, merge_1.mergeTypeDefs)([RootQuery, users_typeDef_1.default, posts_typeDef_1.default]);
