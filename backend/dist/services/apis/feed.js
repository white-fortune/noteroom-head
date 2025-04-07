"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = feedApiRouter;
const express_1 = require("express");
const postService_1 = require("../services/postService");
const userService_1 = require("../services/userService");
const logger_1 = __importDefault(require("../logger"));
const router = (0, express_1.Router)();
function feedApiRouter(io) {
    router.get("/", async (req, res) => {
        try {
            const count = 7;
            const page = Number(req.query.page) || 1;
            const seed = Number(req.query.seed);
            const skip = (page - 1) * count;
            let studentDocID = (await userService_1.Convert.getDocumentID_studentid(req.session["stdid"])).toString();
            logger_1.default.info(`(/feed): Converted to documentID from studentID=${req.session["stdid"] || '--studentID--'}`);
            let notes = await (0, postService_1.getPosts)(studentDocID, { skip: skip, limit: count, seed: seed });
            logger_1.default.info(`(/feed): Got posts of page=${page}, skip=${skip} of studentID=${req.session["stdid"] || '--studentID--'}`);
            if (notes.length != 0) {
                res.json(notes);
            }
            else {
                res.json([]);
            }
        }
        catch (error) {
            logger_1.default.error(`(/feed): Failed to fetch posts of studentID=${req.session["stdid"] || '--studentID--'}: ${error}`);
            res.json([]);
        }
    });
    return router;
}
