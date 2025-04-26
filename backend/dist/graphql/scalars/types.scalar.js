"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const StringOrIntScalarType = new graphql_1.GraphQLScalarType({
    name: "StringOrInt",
    serialize(value) {
        if (typeof value === "number" || typeof value === "string")
            return value;
        throw new Error("value is not String | Number");
    },
    parseValue(value) {
        if (typeof value === "number" || typeof value === "string")
            return value;
        throw new Error("value is not String | Number");
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.INT || ast.kind === graphql_1.Kind.STRING) {
            return ast.value;
        }
        throw new Error("value is not String | Number");
    }
});
exports.default = StringOrIntScalarType;
