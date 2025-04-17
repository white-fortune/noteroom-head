"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressImage = compressImage;
exports.processBulkCompressUpload = processBulkCompressUpload;
exports.processBuikPDFUpload = processBuikPDFUpload;
exports.generateRandomUsername = generateRandomUsername;
const sharp_1 = __importDefault(require("sharp"));
const firebaseService_1 = require("./firebaseService");
const slugify_1 = __importDefault(require("slugify"));
const uuid_1 = require("uuid");
async function compressImage(fileObject) {
    try {
        let imageBuffer = fileObject.data;
        let imageType = fileObject.mimetype === "image/jpeg" ? "jpeg" : "png";
        let compressedBuffer = await (0, sharp_1.default)(imageBuffer)[imageType](imageType === "png"
            ? { quality: 70, compressionLevel: 9, adaptiveFiltering: true }
            : { quality: 70, progressive: true }).toBuffer();
        return { ...fileObject, buffer: compressedBuffer, size: compressedBuffer.length };
    }
    catch (error) {
        return fileObject;
    }
}
async function processBulkCompressUpload(fileObjects, postID) {
    try {
        let compressedFiles = await Promise.all(fileObjects.map(fileObject => compressImage(fileObject)));
        let uploadedFiles = await Promise.all(compressedFiles.map(compressedFile => (0, firebaseService_1.upload)(compressedFile, `posts/${postID}/contents/${compressedFile["fileName"]}`)));
        return { ok: true, content: uploadedFiles };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
async function processBuikPDFUpload(fileObjects, postID) {
    try {
        let files = [];
        let failedUploads = [];
        await Promise.all(fileObjects.map(async (file) => {
            const publicUrl = await (0, firebaseService_1.upload)(file, `posts/${postID}/contents/${file["fileName"]}`);
            if (publicUrl) {
                const name = file.name;
                files.push({ name: name, storageUrl: publicUrl });
            }
            else {
                failedUploads.push(file.name);
            }
        }));
        return { ok: true, files: files, failedUploads: failedUploads };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
function generateRandomUsername(displayname) {
    let sluggfied = (0, slugify_1.default)(displayname, {
        lower: true,
        strict: true
    });
    let uuid = (0, uuid_1.v4)();
    let suffix = uuid.split("-")[0];
    let username = `${sluggfied}-${suffix}`;
    return {
        userID: uuid,
        username: username
    };
}
