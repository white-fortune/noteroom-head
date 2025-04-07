"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = uploadApiRouter;
const express_1 = require("express");
const userService_1 = require("../services/userService");
const postService_1 = require("../services/postService");
const utils_1 = require("../services/utils");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const notes_1 = __importDefault(require("../../schemas/notes"));
const logger_1 = __importDefault(require("../logger"));
const router = (0, express_1.Router)();
const uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many requests, please try again later."
});
function uploadApiRouter(io) {
    router.post("/", async (req, res) => {
        try {
            const studentID = req.session["stdid"];
            if (studentID) {
                const postSubject = req.body.postSubject;
                const postTitle = req.body.postTitle;
                const postDescription = req.body.postDescription;
                if (!(postSubject && postTitle && postDescription)) {
                    res.json({ ok: false, message: "Please fill up all the information to publish." });
                    return;
                }
                else {
                    logger_1.default.info(`(/upload): Got post data of studentID=${req.session["stdid"] || '--studentID--'}, postTitle=${postTitle}`);
                    const studentDocID = (await userService_1.Convert.getDocumentID_studentid(studentID)).toString();
                    const files = req.files;
                    try {
                        const post = await (0, postService_1.addPost)({
                            ownerDocID: studentDocID,
                            subject: postSubject,
                            title: postTitle,
                            description: postDescription
                        });
                        const postID = post._id.toString();
                        logger_1.default.info(`(/upload): Saved post data of studentID=${req.session["stdid"] || '--studentID--'}, postTitle=${postTitle}, postID=${postID}`);
                        if (files) {
                            const filePaths = await (0, utils_1.processBulkCompressUpload)(files, postID);
                            if (filePaths) {
                                logger_1.default.info(`(/upload): Compressed files of post and updated document of studentID=${req.session["stdid"] || '--studentID--'}, postTitle=${postTitle}, postID=${postID}`);
                                await notes_1.default.updateOne({ _id: postID }, { $set: { content: filePaths, completed: true } });
                            }
                            res.json({ ok: true });
                        }
                        else {
                            logger_1.default.info(`(/upload): Updated post document of studentID=${req.session["stdid"] || '--studentID--'}, postTitle=${postTitle}, postID=${postID}`);
                            await notes_1.default.updateOne({ _id: postID }, { $set: { completed: true } });
                            res.json({ ok: true });
                        }
                    }
                    catch (error) {
                        logger_1.default.error(`(/upload): Failed to upload post of studentID=${req.session["stdid"] || '--studentID--'}, postTitle=${postTitle}: ${error}`);
                        res.json({ ok: false, message: "Post couldn't be uploaded! Please try again a bit later or submit a report via support." });
                    }
                }
            }
        }
        catch (error) {
            logger_1.default.error(`(/upload): Failed to upload post of studentID=${req.session["stdid"] || '--studentID--'}: ${error}`);
            res.json({ ok: false });
        }
    });
    router.post("/content", uploadLimiter, async (req, res) => {
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        const MAX_FILE_COUNT = 5;
        const MAX_TITLE_LENGTH = 100;
        const MAX_DESCRIPTION_LENGTH = 500;
        const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
        try {
            const studentID = req.session?.['stdid'] || "--studentid--";
            if (!studentID) {
                return res.status(401).json({ ok: false, message: "Unauthorized. Please login." });
            }
            const { postTitle, postDescription } = req.body;
            const sanitizedTitle = (0, sanitize_html_1.default)(postTitle || "");
            const sanitizedDescription = (0, sanitize_html_1.default)(postDescription || "");
            if (!sanitizedTitle || typeof sanitizedTitle !== "string" || sanitizedTitle.length > MAX_TITLE_LENGTH) {
                return res.status(400).json({
                    ok: false,
                    message: `Title is required, must be a string, and less than ${MAX_TITLE_LENGTH} characters.`
                });
            }
            if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
                return res.status(400).json({
                    ok: false,
                    message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
                });
            }
            logger_1.default.info(`(/upload/content): Received post from studentID=${encodeURIComponent(studentID)}, title=${encodeURIComponent(sanitizedTitle)}`);
            if (req.files && Object.keys(req.files).length > 0) {
                const fileArray = Object.values(req.files).flat();
                if (fileArray.length > MAX_FILE_COUNT) {
                    return res.status(400).json({
                        ok: false,
                        message: `You can upload a maximum of ${MAX_FILE_COUNT} images.`
                    });
                }
                for (const file of fileArray) {
                    if (file.size > MAX_FILE_SIZE) {
                        return res.status(400).json({
                            ok: false,
                            message: "One or more files exceed the maximum allowed size of 5MB."
                        });
                    }
                    if (!file.mimetype.startsWith("image/")) {
                        return res.status(400).json({
                            ok: false,
                            message: "Only image files are allowed."
                        });
                    }
                    const fileExtension = path_1.default.extname(file.name).toLowerCase();
                    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
                        return res.status(400).json({
                            ok: false,
                            message: `Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} are allowed.`
                        });
                    }
                    const sanitizedFileName = `${Date.now()}-${crypto_1.default.randomBytes(16).toString("hex")}${fileExtension}`;
                    logger_1.default.info(`(/upload/content): File uploaded successfully for studentID=${studentID}, fileName=${sanitizedFileName}`);
                }
            }
            else {
                logger_1.default.info(`(/upload/content): No files uploaded, studentID=${studentID}, title=${sanitizedTitle}`);
            }
            return res.status(200).json({ ok: true, message: "Post uploaded successfully!" });
        }
        catch (error) {
            logger_1.default.error(`(/upload/content): Error for studentID=${req.session?.['stdid']}, error=${error}`);
            return res.status(500).json({
                ok: false,
                message: "An error occurred while uploading. Please try again later."
            });
        }
    });
    return router;
}
