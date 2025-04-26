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
const notes_model_1 = __importStar(require("../../schemas/notes.model"));
const students_model_1 = __importDefault(require("../../schemas/students.model"));
const post_service_1 = require("../../services/post.service");
const user_service_1 = require("../../services/user.service");
const vote_service_1 = require("../../services/vote.service");
const PostsResolvers = {
    Post: {
        async content(parent, args) {
            try {
                const postID = parent.postID;
                const content = (await notes_model_1.default.findOne({ postID: postID, postType: notes_model_1.PostType.CONTENT }, { content: 1 }))?.["content"];
                if (content && content.length !== 0) {
                    let sliced;
                    if (!args.startIndex && !args.count) {
                        sliced = content;
                    }
                    else if (!args.count) {
                        sliced = content.slice(args.startIndex);
                    }
                    else {
                        sliced = content.slice(args.startIndex, args.count);
                    }
                    return {
                        resources: sliced,
                        returnedContentCount: sliced.length,
                        totalContentCount: content.length
                    };
                }
                else {
                    return [];
                }
            }
            catch (error) {
                return [];
            }
        },
        async owner(parent) {
            try {
                const user = await students_model_1.default.findOne({ username: parent.ownerUserName });
                return user;
            }
            catch (error) {
                return null;
            }
        },
        async isPostOwner(parent, _, context) {
            try {
                const { req, res } = context;
                const postOwnerUsername = parent.ownerUserName;
                const viewrUserName = await user_service_1.Convert.getUserName_studentid(req.session["stdid"]);
                return postOwnerUsername === viewrUserName;
            }
            catch (error) {
                return false;
            }
        },
        async interactionData(parent, _, context) {
            try {
                const { req, res } = context;
                const post = await notes_model_1.default.findOne({ postID: parent.postID }, { feedbackCount: 1, upvoteCount: 1 });
                const userDocID = (await user_service_1.Convert.getDocumentID_studentid(req.session["stdid"])).toString();
                const issaved = await (0, post_service_1.isSaved)(userDocID, post._id.toString());
                const isupvoted = await (0, vote_service_1.isUpvoted)(post._id.toString(), userDocID);
                return { ...post.toObject(), isSaved: issaved, isUpvoted: isupvoted };
            }
            catch (error) {
                return null;
            }
        }
    }
};
exports.default = PostsResolvers;
