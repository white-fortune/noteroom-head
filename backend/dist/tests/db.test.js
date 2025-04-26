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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const url = "mongodb+srv://rafirahmanpro:ohJhvoK6ELpvq5Km@cluster0.uregmk5.mongodb.net/information?retryWrites=true&w=majority&appName=Cluster0";
const Users = mongoose_1.default.model('students', new mongoose_1.default.Schema({}, { strict: false }));
const Posts = mongoose_1.default.model('posts', new mongoose_1.default.Schema({}, { strict: false }));
(0, mongoose_1.connect)(url).then(() => {
    console.log(`Connected`);
    addOwnerUsername().then(data => {
        console.log("Done");
    });
});
async function addOwnerUsername() {
    const posts = (await Posts.find({}, { ownerDocID: 1, postID: 1 }));
    await Promise.all(posts.map(async (post) => {
        const { ownerDocID, postID } = post;
        const username = (await Users.findById(ownerDocID, { username: 1 }))?.["username"];
        await Posts.updateOne({ postID: postID }, {
            $set: { ownerUserName: username }
        });
        console.log(`Done for ${postID}`);
    }));
}
