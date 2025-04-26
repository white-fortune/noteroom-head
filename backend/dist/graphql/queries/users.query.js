"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSavedPostsByUsername = exports.getUserByUsername = void 0;
const client_1 = require("@apollo/client");
const getUserByUsername = (0, client_1.gql) `
    query GetUser($username: String!) {
        user(username: $username) {
            profile_pic
            displayname
            rollnumber
            collegeyear
            bio
            favouritesubject
            notfavsubject
            group
            username
            collegeID
            featuredNoteCount
            owner
            badges {
                badgeID
                badgeLogo
                badgeText
            }
            owned_posts {
                postID
                title
                content(startIndex: 0, count: 1) {
                    resources
                }
            }
        }
    }
`;
exports.getUserByUsername = getUserByUsername;
const getSavedPostsByUsername = (0, client_1.gql) `
    query GetSavedPosts($username: String!) {
        user(username: $username) {
            saved_posts {
                postID
                title
                content(startIndex: 0, count: 1) {
                    resources
                }
            }
        }
    }
`;
exports.getSavedPostsByUsername = getSavedPostsByUsername;
