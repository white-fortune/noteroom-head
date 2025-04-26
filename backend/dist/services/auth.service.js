"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.getUserAuth = getUserAuth;
exports.getUserVarification = getUserVarification;
exports.addUserProfile = addUserProfile;
const students_model_1 = __importDefault(require("../schemas/students.model"));
const google_auth_library_1 = require("google-auth-library");
async function verifyToken(client_id, id_token) {
    const client = new google_auth_library_1.OAuth2Client(client_id);
    try {
        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: client_id
        });
        return ticket.getPayload();
    }
    catch (error) {
        throw new Error(error);
    }
}
async function getUserAuth(studentID_) {
    try {
        const authData = await students_model_1.default.findOne({ studentID: studentID_ }, { studentID: 1, username: 1, _id: 0 });
        const { studentID, username } = authData;
        return { ok: true, userAuth: { studentID, username } };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
async function getUserVarification(email) {
    try {
        let student = await students_model_1.default.findOne({ email: email });
        if (student) {
            return {
                ok: true, data: {
                    studentPass: student["password"],
                    studentID: student["studentID"],
                    username: student["username"],
                    authProvider: student["authProvider"]
                }
            };
        }
        else {
            return { ok: false, code: "NO_EMAIL" };
        }
    }
    catch (error) {
        return { ok: false, code: "SERVER", error: error };
    }
}
async function addUserProfile(user) {
    try {
        const userData = await students_model_1.default.create(user);
        return { ok: true, data: userData };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
