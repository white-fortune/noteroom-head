"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PostTypeDefs = `#graphql
    type Content {
        resources: [String]
        returnedContentCount: Int
        totalContentCount: Int
    }

    type InteractionData {
        feedbackCount: Int
        upvoteCount: Int
        isSaved: Boolean
        isUpvoted: Boolean
    }

    type Post {
        postID: String!
        title: String!
        description: String
        createdAt: String
        isPostOwner: Boolean!
        content(startIndex: Int, count: Int): Content
        owner: User
        interactionData: InteractionData
        ownerUserName: String!
    }
`;
exports.default = PostTypeDefs;
