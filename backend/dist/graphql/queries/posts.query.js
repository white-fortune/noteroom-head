"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostContentsByPostID = exports.getPostsByPage = exports.getPostByPostID = void 0;
const client_1 = require("@apollo/client");
const getPostByPostID = (0, client_1.gql) `
    query GetPost($postID: String!) {
        post(postID: $postID) {
            postID
            title
            description
            createdAt
            isPostOwner
            content(startIndex: 0) {
                resources
                totalContentCount
            }
            owner {
                profile_pic
                displayname
                username
            }
            interactionData {
                feedbackCount
                upvoteCount
                isSaved
                isUpvoted
            }
        }
    }
`;
exports.getPostByPostID = getPostByPostID;
const getPostsByPage = (0, client_1.gql) `
    query GetPostBypage($page: Int!, $seed: Int!) {
        posts(page: $page, seed: $seed) {
            postID
            title
            description
            createdAt
            isPostOwner
            content(startIndex: 0) {
                resources
                totalContentCount
            }
            owner {
                profile_pic
                displayname
                username
            }
            interactionData {
                feedbackCount
                upvoteCount
                isSaved
                isUpvoted
            }
        }
    }
`;
exports.getPostsByPage = getPostsByPage;
const getPostContentsByPostID = (0, client_1.gql) `
    query GetPostContentsByPostID($postID: String!) {
        post(postID: $postID) {
            content(startIndex: 0) {
                resources
                totalContentCount
            }
        }
    }
`;
exports.getPostContentsByPostID = getPostContentsByPostID;
