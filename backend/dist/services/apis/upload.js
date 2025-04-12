"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = uploadApiRouter;
const express_1 = require("express");
const userService_1 = require("../services/userService");
const postService_1 = require("../services/postService");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const notes_1 = __importStar(require("../../schemas/notes"));
const logger_1 = __importDefault(require("../logger"));
const jsdom_1 = require("jsdom");
const uuid_1 = require("uuid");
const utils_1 = require("../services/utils");
const router = (0, express_1.Router)();
function uploadApiRouter(io) {
    router.use((0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 5,
        message: "Too many requests, please try again later."
    }));
    router.post("/content", async (req, res) => {
        const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;
        const MAX_FILE_COUNT = 100;
        const MAX_TITLE_LENGTH = 100;
        const MAX_DESCRIPTION_LENGTH = 500;
        const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
        const postID = (0, uuid_1.v4)();
        try {
            const studentID = req.session?.['stdid'] || "--studentid--";
            if (!studentID)
                return;
            const { postTitle, postDescription } = req.body;
            const sanitizedTitle = (0, sanitize_html_1.default)(postTitle || "");
            const sanitizedDescription = (0, sanitize_html_1.default)(postDescription || "");
            const ownerDocID = (await userService_1.Convert.getDocumentID_studentid(studentID)).toString();
            const postData = {
                postID: postID,
                ownerDocID: ownerDocID,
                title: null,
                description: null,
                content: []
            };
            logger_1.default.info(`(/upload/content): Got post data of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}`);
            let fileObjects = [];
            if (!sanitizedTitle || typeof sanitizedTitle !== "string" || sanitizedTitle.length > MAX_TITLE_LENGTH) {
                return res.json({
                    ok: false,
                    message: `Title is required, must be a string, and less than ${MAX_TITLE_LENGTH} characters.`
                });
            }
            if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
                return res.json({
                    ok: false,
                    message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
                });
            }
            postData.title = sanitizedTitle;
            postData.description = (new jsdom_1.JSDOM(sanitizedDescription)).window.document.querySelector("p")?.textContent.trim().length !== 0 ? sanitizedDescription : null;
            if (req.files && Object.keys(req.files).length > 0) {
                const fileArray = Object.values(req.files).flat();
                if (fileArray.length > MAX_FILE_COUNT) {
                    return res.json({
                        ok: false,
                        message: `You can upload a maximum of ${MAX_FILE_COUNT} images.`
                    });
                }
                for (const file of fileArray) {
                    if (file.size > MAX_FILE_SIZE) {
                        return res.json({
                            ok: false,
                            message: "One or more files exceed the maximum allowed size of 5MB."
                        });
                    }
                    if (!file.mimetype.startsWith("image/")) {
                        return res.json({
                            ok: false,
                            message: "Only image files are allowed."
                        });
                    }
                    const fileExtension = path_1.default.extname(file.name).toLowerCase();
                    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
                        return res.json({
                            ok: false,
                            message: `Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} are allowed.`
                        });
                    }
                    const sanitizedFileName = `${Date.now()}-${crypto_1.default.randomBytes(16).toString("hex")}${fileExtension}`;
                    file["fileName"] = sanitizedFileName;
                    fileObjects.push(file);
                    logger_1.default.info(`(/upload/content): File sanitized and handled successfully for studentID=${studentID}, fileName=${postData.postID + " = " + sanitizedFileName}`);
                }
            }
            if (fileObjects.length !== 0) {
                const uploadResponse = await (0, utils_1.processBulkCompressUpload)(fileObjects, postData.postID);
                if (uploadResponse.ok) {
                    logger_1.default.info(`(/upload/content): Compressed files of post on firebase of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}`);
                    postData.content = uploadResponse.content;
                }
                else {
                    logger_1.default.error(`(/upload/content): Couldn't compress files of post on firebase of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}: ${uploadResponse.error}`);
                }
            }
            const response = await (0, postService_1.addPost)(postData, notes_1.PostType.CONTENT);
            if (response.ok) {
                logger_1.default.info(`(/upload/content): Added post document of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}`);
                await notes_1.default.updateOne({ _id: response.postID }, { completed: true });
                return res.json({ ok: true, message: "Post uploaded successfully!" });
            }
            else {
                await (0, postService_1.deletePost)(postData.postID, notes_1.PostType.CONTENT);
                logger_1.default.error(`(/upload/content): Couldn't post document of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}: ${response.error}`);
                return res.json({ ok: false, message: "Post couldn't get uploaded. Please try again a bit later." });
            }
        }
        catch (error) {
            await (0, postService_1.deletePost)(postID, notes_1.PostType.CONTENT);
            logger_1.default.error(`(/upload/content): Error for studentID=${req.session?.['stdid'] || "--studentid--"}: ${error}`);
            return res.json({
                ok: false,
                message: "An error occurred while uploading. Please try again later."
            });
        }
    });
    router.post("/mcq", async (req, res) => {
        const MAX_TITLE_LENGTH = 300;
        const MAX_MCQ_LIMIT = 30;
        const OPTIONS_LENGTH = 4;
        const postID = (0, uuid_1.v4)();
        try {
            const studentID = req.session?.['stdid'];
            if (!studentID)
                return;
            const { postTitle: title, mcqStrings } = req.body;
            const mcqs = JSON.parse(mcqStrings);
            const ownerDocID = (await userService_1.Convert.getDocumentID_studentid(studentID)).toString();
            if (!title || typeof title !== "string" || title.trim() === "") {
                return res.json({
                    ok: false,
                    message: "Title is required and must be a non-empty string."
                });
            }
            const sanitizedTitle = (0, sanitize_html_1.default)(title);
            if (sanitizedTitle.length > MAX_TITLE_LENGTH) {
                return res.json({
                    ok: false,
                    message: `Title must be less than ${MAX_TITLE_LENGTH} characters.`
                });
            }
            if (!Array.isArray(mcqs) || mcqs.length === 0 || mcqs.length > MAX_MCQ_LIMIT) {
                return res.json({
                    ok: false,
                    message: `MCQs are required, and the limit is ${MAX_MCQ_LIMIT} questions.`
                });
            }
            for (const mcq of mcqs) {
                const { question, options, correctAnswer } = mcq;
                if (!question || typeof question !== 'string') {
                    return res.json({ ok: false, message: "Each question must be a string." });
                }
                if (!Array.isArray(options) || options.length !== OPTIONS_LENGTH) {
                    return res.json({ ok: false, message: "Each MCQ must have exactly 4 options." });
                }
                for (const option of options) {
                    if (!option.optionType || !['A', 'B', 'C', 'D'].includes(option.optionType)) {
                        return res.json({ ok: false, message: "Each option must have a valid option type (A/B/C/D)." });
                    }
                    if (!option.optionText || typeof option.optionText !== 'string') {
                        return res.json({ ok: false, message: "Each option must have valid option text." });
                    }
                }
                if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
                    return res.json({ ok: false, message: "Correct answer must be one of the options (A/B/C/D)." });
                }
            }
            logger_1.default.info(`/upload/mcq: Received MCQs from studentID=${encodeURIComponent(studentID)}, title=${encodeURIComponent(sanitizedTitle)}`);
            const modifiedMQCs = mcqs.map((mcq) => {
                const questionID = `${Date.now()}-${crypto_1.default.randomBytes(16).toString("hex")}`;
                const options = mcq.options.map(option => {
                    const optionID = `${option.optionType}:${questionID}`;
                    return { ...option, optionID: optionID };
                });
                return { ...mcq, questionID: questionID, options: options };
            });
            const postData = {
                postID: postID,
                ownerDocID: ownerDocID,
                mcqs: modifiedMQCs,
                title: sanitizedTitle
            };
            const response = await (0, postService_1.addPost)(postData, notes_1.PostType.MCQ);
            if (response.ok) {
                return res.json({
                    ok: true,
                    message: "MCQs uploaded successfully!"
                });
            }
            else {
                return res.json({
                    ok: false,
                    message: "MCQs couldn't be uploaded successfully! Try again a bit later"
                });
            }
        }
        catch (error) {
            logger_1.default.error(`/upload/mcq: Error for studentID=${req.session?.['stdid']}, error=${error.message || error}`);
            return res.json({
                ok: false,
                message: "An error occurred while uploading MCQs. Please try again later."
            });
        }
    });
    router.post("/file", async (req, res) => {
        const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;
        const MAX_TITLE_LENGTH = 100;
        const MAX_DESCRIPTION_LENGTH = 500;
        const ALLOWED_EXTENSIONS = [".pdf"];
        try {
            const studentID = "9181e241-575c-4ef3-9d3c-2150eac4566d";
            if (!studentID)
                return;
            const { title, description } = req.body;
            const sanitizedTitle = (0, sanitize_html_1.default)(title || "").trim();
            const sanitizedDescription = (0, sanitize_html_1.default)(description || "").trim();
            if (!sanitizedTitle || typeof sanitizedTitle !== "string" || sanitizedTitle.length > MAX_TITLE_LENGTH) {
                return res.json({
                    ok: false,
                    message: `Title is required, must be a string, and less than ${MAX_TITLE_LENGTH} characters.`
                });
            }
            if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
                return res.json({
                    ok: false,
                    message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
                });
            }
            logger_1.default.info(`(/upload/file): Received file postdata from studentID=${encodeURIComponent(studentID)}, title=${encodeURIComponent(sanitizedTitle)}`);
            if (!req.files || !req.files.file) {
                return res.json({ ok: false, message: "A file must be uploaded." });
            }
            const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;
            const fileExtension = path_1.default.extname(file.name).toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
                return res.json({ ok: false, message: `Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} are allowed.` });
            }
            if (file.size > MAX_FILE_SIZE) {
                return res.json({ ok: false, message: "File exceeds the maximum allowed size of 5MB." });
            }
            const sanitizedFileName = `${Date.now()}-${crypto_1.default.randomBytes(16).toString("hex")}${fileExtension}`;
            logger_1.default.info(`(/upload/file): File uploaded and metadata saved for studentID=${studentID}, fileName=${sanitizedFileName}`);
            return res.json({
                ok: true,
                message: "File uploaded successfully!",
            });
        }
        catch (error) {
            logger_1.default.error(`(/upload/file): Error for studentID=1, error=${error}`);
            return res.json({
                ok: false,
                message: "An error occurred while uploading. Please try again later."
            });
        }
    });
    router.post("/link", async (req, res) => {
        const MAX_TITLE_LENGTH = 100;
        const MAX_DESCRIPTION_LENGTH = 500;
        const postID = (0, uuid_1.v4)();
        try {
            const studentID = "9181e241-575c-4ef3-9d3c-2150eac4566d";
            if (!studentID)
                return;
            const { postTitle, postDescription, links } = req.body;
            const sanitizedTitle = (0, sanitize_html_1.default)(postTitle || "").trim();
            const sanitizedDescription = (0, sanitize_html_1.default)(postDescription || "").trim();
            const sanitizedLinks = JSON.parse(links || "[]").map((link) => (0, sanitize_html_1.default)(link || "").trim());
            const ownerDocID = (await userService_1.Convert.getDocumentID_studentid(studentID)).toString();
            if (sanitizedLinks.length === 0) {
                return res.json({
                    ok: false,
                    message: `Links are required`
                });
            }
            if (!sanitizedTitle || typeof sanitizedTitle !== "string" || sanitizedTitle.length > MAX_TITLE_LENGTH) {
                return res.json({
                    ok: false,
                    message: `Title is required, must be a string, and less than ${MAX_TITLE_LENGTH} characters.`
                });
            }
            if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
                return res.json({
                    ok: false,
                    message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
                });
            }
            for (const sanitizedLink of sanitizedLinks) {
                if (!sanitizedLink || !/^https?:\/\//i.test(sanitizedLink)) {
                    return res.json({
                        ok: false,
                        message: "A valid URL starting with http:// or https:// is required."
                    });
                }
            }
            const postData = {
                ownerDocID: ownerDocID,
                title: sanitizedTitle,
                postID: postID,
                links: sanitizedLinks
            };
            console.log(postData);
            logger_1.default.info(`(/upload/link): Link saved for studentID=1, link=${sanitizedLinks}`);
            res.status(200).json({
                ok: true,
                message: "Link uploaded successfully!",
            });
        }
        catch (error) {
            console.error(error);
            logger_1.default.error(`(/upload/link): Error for studentID=1, error=${error}`);
            res.status(500).json({
                ok: false,
                message: "An error occurred while uploading the link. Please try again later."
            });
        }
    });
    return router;
}
