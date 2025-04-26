"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.upload = void 0;
const path_1 = require("path");
const dotenv_1 = require("dotenv");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const chalk_1 = __importDefault(require("chalk"));
(0, dotenv_1.config)({ path: (0, path_1.join)(__dirname, '../../.env') });
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN === "true" ? process.env.FIREBASE_CLOUD_CRED_ADMIN : process.env.FIREBASE_CLOUD_CRED_EMPLOYEE);
const bucketName = process.env.DEVELOPMENT === "true" ? process.env.NOTEROOM_DEVELOPMENT_FIREBASE_BUCKET : process.env.NOTEROOM_PRODUCTION_FIREBASE_BUCKET;
console.log(chalk_1.default.cyan(`[-] admin mode: ${chalk_1.default.yellow(process.env.FIREBASE_ADMIN)}`));
console.log(chalk_1.default.cyan(`[-] using firebase bucket: ${chalk_1.default.yellow(bucketName)}`));
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount),
    storageBucket: `gs://${bucketName}`
});
let bucket = firebase_admin_1.default.storage().bucket();
async function uploadImage(fileObject, fileName) {
    try {
        const file = bucket.file(fileName);
        await file.save(fileObject.buffer || fileObject.data, {
            metadata: { contentType: fileObject.mimetype }
        });
        await file.makePublic();
        let publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        return publicUrl;
    }
    catch (error) {
        return null;
    }
}
async function deleteImage(postID) {
    try {
        const [files] = await bucket.getFiles({ prefix: `posts/${postID}/contents/` });
        if (files.length === 0)
            return { ok: true };
        const deletePromise = files.map(file => file.delete());
        await Promise.all(deletePromise);
        return { ok: true };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
exports.upload = uploadImage;
exports.deleteFile = deleteImage;
