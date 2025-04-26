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
const user_service_1 = require("../services/user.service");
const post_service_1 = require("../services/post.service");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const notes_model_1 = __importStar(require("../schemas/notes.model"));
const logger_1 = __importDefault(require("../logger"));
const jsdom_1 = require("jsdom");
const uuid_1 = require("uuid");
const utils_1 = require("../services/utils");
const router = (0, express_1.Router)();
async function handleUploadError(message, postID, postType, response) {
    await (0, post_service_1.deletePost)(postID, postType);
    logger_1.default.error(message);
    return response.json({
        ok: false,
        message: "Post cannot be uploaded. Please try again a bit later!"
    });
}
function uploadApiRouter(io) {
    router.use((0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 5,
        message: "Too many requests, please try again later."
    }));
    router.post("/content", async (req, res) => {
        const MAX_FILE_SIZE = 5 * 1024 * 1024 * 100;
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
            const ownerDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
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
            try {
                if (fileObjects.length !== 0) {
                    const uploadResponse = await (0, utils_1.processBulkCompressUpload)(fileObjects, postData.postID);
                    if (!uploadResponse.ok) {
                        return await handleUploadError(`(/upload/content): Couldn't compress files of post on firebase of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}: ${uploadResponse.error}`, postID, notes_model_1.PostType.CONTENT, res);
                    }
                    logger_1.default.info(`(/upload/content): Compressed files of post on firebase of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}`);
                    postData.content = uploadResponse.content;
                }
                const response = await (0, post_service_1.addPost)(postData, notes_model_1.PostType.CONTENT);
                if (!response.ok) {
                    return await handleUploadError(`(/upload/content): Couldn't compress files of post on firebase of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}: ${response.error}`, postID, notes_model_1.PostType.CONTENT, res);
                }
                logger_1.default.info(`(/upload/content): Added post document of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}`);
                await notes_model_1.default.updateOne({ _id: response.postID }, { completed: true });
                return res.json({ ok: true, message: "Post uploaded successfully!" });
            }
            catch (error) {
                return await handleUploadError(`(/upload/content): Couldn't compress files of post on firebase of studentID=${req.session["stdid"] || '--studentID--'}, postID=${postData?.postID || sanitizedTitle}: ${error}`, postID, notes_model_1.PostType.CONTENT, res);
            }
        }
        catch (error) {
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
            const ownerDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
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
            const response = await (0, post_service_1.addPost)(postData, notes_model_1.PostType.MCQ);
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
        const MAX_FILES = 5;
        const MAX_TITLE_LENGTH = 100;
        const MAX_DESCRIPTION_LENGTH = 500;
        const ALLOWED_EXTENSIONS = [".pdf"];
        const postID = (0, uuid_1.v4)();
        try {
            const studentID = req.session?.["stdid"];
            if (!studentID)
                return;
            const { postTitle: title, postDescription: description } = req.body;
            const sanitizedTitle = (0, sanitize_html_1.default)(title || "").trim();
            const sanitizedDescription = (0, sanitize_html_1.default)(description || "").trim();
            const ownerDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
            const postData = {
                postID: postID,
                description: null,
                ownerDocID: ownerDocID,
                title: null,
                files: []
            };
            logger_1.default.info(`(/upload/file): Received post data for studentID=${studentID}, postID=${postID}`);
            if (!sanitizedTitle || typeof sanitizedTitle !== "string" || sanitizedTitle.length > MAX_TITLE_LENGTH) {
                logger_1.default.error(`(/upload/file): Invalid title from studentID=${studentID}`);
                return res.json({
                    ok: false,
                    message: `Title is required, must be a string, and less than ${MAX_TITLE_LENGTH} characters.`,
                });
            }
            if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
                logger_1.default.error(`(/upload/file): Description too long from studentID=${studentID}`);
                return res.json({
                    ok: false,
                    message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
                });
            }
            let fileObjects = [];
            postData.description = (new jsdom_1.JSDOM(sanitizedDescription)).window.document.querySelector("p")?.textContent.trim().length !== 0 ? sanitizedDescription : null;
            postData.title = sanitizedTitle;
            if (!req.files || Object.keys(req.files).length === 0) {
                logger_1.default.error(`(/upload/file): No files uploaded by studentID=${studentID}`);
                return res.json({
                    ok: false,
                    message: "At least one file needs to be selected"
                });
            }
            const uploadedFiles = Object.values(req.files).flat();
            if (uploadedFiles.length > MAX_FILES) {
                logger_1.default.error(`(/upload/file): Too many files uploaded by studentID=${studentID}`);
                return res.json({
                    ok: false,
                    message: `You can only upload up to ${MAX_FILES} files at a time.`,
                });
            }
            for (const file of uploadedFiles) {
                const fileExtension = path_1.default.extname(file.name).toLowerCase();
                if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
                    logger_1.default.error(`(/upload/file): Invalid file extension (${fileExtension}) by studentID=${studentID}`);
                    return res.json({
                        ok: false,
                        message: `Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(", ")} are allowed.`,
                    });
                }
                if (file.size > MAX_FILE_SIZE) {
                    logger_1.default.error(`(/upload/file): File too large by studentID=${studentID}`);
                    return res.json({
                        ok: false,
                        message: "File exceeds the maximum allowed size of 5GB.",
                    });
                }
                const sanitizedFileName = `${Date.now()}-${crypto_1.default.randomBytes(16).toString("hex")}${fileExtension}`;
                file["fileName"] = sanitizedFileName;
                fileObjects.push(file);
                logger_1.default.info(`(/upload/file): File sanitized successfully for studentID=${studentID}, fileName=${postID + " = " + sanitizedFileName}`);
            }
            try {
                const uploadResponse = await (0, utils_1.processBuikPDFUpload)(fileObjects, postID);
                if (!uploadResponse.ok) {
                    return await handleUploadError(`(/upload/file): Failed to upload files to storage for studentID=${studentID}, postID=${postID}: ${uploadResponse.error}`, postID, notes_model_1.PostType.FILE, res);
                }
                const files = uploadResponse.files;
                postData.files = files;
                logger_1.default.info(`(/upload/file): Files uploaded to storage for studentID=${studentID}, postID=${postID}`);
                const response = await (0, post_service_1.addPost)(postData, notes_model_1.PostType.FILE);
                if (response.ok) {
                    await notes_model_1.default.updateOne({ _id: response.postID }, { completed: true });
                    logger_1.default.info(`(/upload/file): Post document created for studentID=${studentID}, postID=${postID}`);
                    return res.json({ ok: true, message: "Files posted successfully." });
                }
                else {
                    return await handleUploadError(`(/upload/file): Failed to upload files to storage for studentID=${studentID}, postID=${postID}: ${response.error}`, postID, notes_model_1.PostType.FILE, res);
                }
            }
            catch (error) {
                return await handleUploadError(`(/upload/file): Failed to upload files to storage for studentID=${studentID}, postID=${postID}: ${error}`, postID, notes_model_1.PostType.FILE, res);
            }
        }
        catch (error) {
            logger_1.default.error(`(/upload/file): Error while uploading: ${error}`);
            return res.json({
                ok: false,
                message: "An error occurred while uploading. Please try again later.",
            });
        }
    });
    router.post("/link", async (req, res) => {
        const MAX_TITLE_LENGTH = 100;
        const postID = (0, uuid_1.v4)();
        const isValidUrl = (url) => {
            try {
                new URL(url);
                return true;
            }
            catch (e) {
                return false;
            }
        };
        try {
            const studentID = req.session?.['stdid'];
            if (!studentID)
                return;
            const { postTitle, linksString } = req.body;
            const links = JSON.parse(linksString || "[]");
            const sanitizedTitle = (0, sanitize_html_1.default)(postTitle || "").trim();
            const ownerDocID = (await user_service_1.Convert.getDocumentID_studentid(studentID)).toString();
            const postData = {
                postID: postID,
                ownerDocID: ownerDocID,
                title: null,
                links: []
            };
            if (links.length === 0) {
                return res.json({
                    ok: false,
                    message: "Valid HTTP or HTTPS link(s) is required."
                });
            }
            logger_1.default.info(`(/upload/link): Received post for studentID=${studentID}, postID=${postID}`);
            if (!sanitizedTitle || typeof sanitizedTitle !== "string" || sanitizedTitle.length > MAX_TITLE_LENGTH) {
                return res.json({
                    ok: false,
                    message: `Title is required, must be a string, and less than ${MAX_TITLE_LENGTH} characters.`
                });
            }
            postData.title = sanitizedTitle;
            for (const link of links) {
                const sanitizedLink = (0, sanitize_html_1.default)(link || "").trim().toLowerCase();
                if (!sanitizedLink || typeof sanitizedLink !== "string" || !/^https?:\/\//.test(sanitizedLink) || !isValidUrl(sanitizedLink)) {
                    return res.json({
                        ok: false,
                        message: "Valid HTTP or HTTPS link(s) is required."
                    });
                }
            }
            postData.links = links;
            const response = await (0, post_service_1.addPost)(postData, notes_model_1.PostType.LINK);
            if (response.ok) {
                logger_1.default.info(`(/upload/link): Post saved for studentID=${req.session["stdid"] || '--studentID--'}, postID=${postID}`);
                return res.json({ ok: true, message: "Link post uploaded successfully!" });
            }
            else {
                logger_1.default.error(`(/upload/link): Failed to add post for studentID=${req.session["stdid"] || '--studentID--'}: ${response.error}`);
                return res.json({
                    ok: false,
                    message: "Post couldn't be uploaded. Please try again later."
                });
            }
        }
        catch (error) {
            logger_1.default.error(`(/upload/link): Exception for studentID==${req.session["stdid"] || '--studentID--'}: ${error}`);
            return res.json({
                ok: false,
                message: "An error occurred while uploading. Please try again later."
            });
        }
    });
    return router;
}
