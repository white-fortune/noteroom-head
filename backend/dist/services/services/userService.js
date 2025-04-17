"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Convert = void 0;
exports.getProfile = getProfile;
exports.getMutualCollegeStudents = getMutualCollegeStudents;
exports.searchStudent = searchStudent;
exports.updateProfileFields = updateProfileFields;
const students_1 = __importDefault(require("../../schemas/students"));
const mongoose_1 = __importDefault(require("mongoose"));
exports.Convert = {
    async getStudentID_username(username) {
        try {
            let studentID = (await students_1.default.findOne({ username: username }, { studentID: 1 }))["studentID"];
            return studentID;
        }
        catch (error) {
            return null;
        }
    },
    async getDocumentID_studentid(studentID) {
        try {
            let documentID = (await students_1.default.findOne({ studentID: studentID }, { _id: 1 }))["_id"];
            return documentID;
        }
        catch (error) {
            return null;
        }
    },
    async getUserName_studentid(studentID) {
        try {
            let username = (await students_1.default.findOne({ studentID: studentID }, { username: 1 }))["username"];
            return username;
        }
        catch (error) {
            return null;
        }
    },
    async getStudentID_email(email) {
        try {
            let studentID = (await students_1.default.findOne({ email: email }, { studentID: 1 }))["studentID"];
            return studentID;
        }
        catch (error) {
            return null;
        }
    },
    async getEmail_studentid(studentID) {
        try {
            let email = (await students_1.default.findOne({ studentID: studentID }, { email: 1 }))["email"];
            return email;
        }
        catch (error) {
            return null;
        }
    },
    async getDisplayName_email(email) {
        try {
            let displayname = (await students_1.default.findOne({ email: email }, { displayname: 1 }))["displayname"];
            return displayname;
        }
        catch (error) {
            return null;
        }
    },
    async getDocumentID_username(username) {
        try {
            let documentID = (await students_1.default.findOne({ username: username }, { _id: 1 }))["_id"];
            return documentID;
        }
        catch (error) {
            return null;
        }
    }
};
async function getProfile(username) {
    try {
        let student = await students_1.default.aggregate([
            { $match: { username: username } },
            {
                $addFields: {
                    featuredNoteCount: { $size: "$featured_notes" }
                }
            },
            {
                $lookup: {
                    from: "posts",
                    localField: "owned_notes",
                    foreignField: "_id",
                    as: "owned_posts"
                }
            },
            {
                $lookup: {
                    from: 'badges',
                    localField: 'badges',
                    foreignField: 'badgeID',
                    as: 'badges'
                }
            },
            {
                $project: {
                    _id: 0,
                    username: 1, displayname: 1, group: 1,
                    profile_pic: 1, bio: 1, collegeID: 1, collegeyear: 1,
                    favouritesubject: 1, notfavsubject: 1, featuredNoteCount: 1,
                    rollnumber: 1, badges: 1,
                    owned_posts: {
                        $map: {
                            input: "$owned_posts",
                            as: "post",
                            in: {
                                noteTitle: "$$post.title",
                                noteID: "$$post._id",
                                noteThumbnail: { $first: "$$post.content" }
                            }
                        }
                    }
                }
            }
        ]);
        if (student.length === 0)
            return { ok: false };
        return { ok: true, student: student[0] };
    }
    catch (error) {
        console.log(error);
        return { ok: false };
    }
}
async function getMutualCollegeStudents(studentDocID, options) {
    let collegeID = (await students_1.default.findOne({ _id: studentDocID }, { collegeID: 1 }))["collegeID"];
    if (!options) {
        let students = await students_1.default.find({ collegeID: collegeID, visibility: "public", _id: { $ne: studentDocID } }, { profile_pic: 1, displayname: 1, bio: 1, username: 1, _id: 0, collegeID: 1 });
        return students;
    }
    else {
        let resultCount;
        if (options.countDoc) {
            resultCount = await students_1.default.countDocuments({ collegeID: collegeID, visibility: "public", _id: { $ne: new mongoose_1.default.Types.ObjectId(studentDocID) } });
        }
        let students = await students_1.default.aggregate([
            { $match: { collegeID: collegeID, visibility: "public", _id: { $ne: new mongoose_1.default.Types.ObjectId(studentDocID) } } },
            { $skip: options.skip },
            { $limit: options.count },
            {
                $project: {
                    profile_pic: 1,
                    displayname: 1,
                    bio: 1,
                    username: 1,
                    _id: 0,
                    collegeID: 1
                }
            }
        ]);
        return { students, totalCount: resultCount };
    }
}
async function searchStudent(searchTerm, options) {
    const regex = new RegExp(searchTerm.split(' ').map(word => `(${word})`).join('.*'), 'i');
    if (!options) {
        let students = await students_1.default.find({ username: { $regex: regex }, visibility: "public", onboarded: true }, { profile_pic: 1, displayname: 1, bio: 1, username: 1, _id: 0 });
        return students;
    }
    else {
        let resultCount;
        if (options.countDoc) {
            resultCount = await students_1.default.countDocuments({ username: { $regex: regex }, visibility: "public", onboarded: true });
        }
        let students = await students_1.default.aggregate([
            { $match: { username: { $regex: regex }, visibility: "public", onboarded: true } },
            { $skip: options.skip },
            { $limit: options.maxCount },
            {
                $project: {
                    profile_pic: 1,
                    displayname: 1,
                    bio: 1,
                    username: 1,
                    _id: 0
                }
            }
        ]);
        return { students, totalCount: resultCount };
    }
}
async function updateProfileFields(studentID, updates) {
    try {
        await students_1.default.updateOne({ studentID: studentID }, updates);
        return { ok: true };
    }
    catch (error) {
        return { ok: false, error: error };
    }
}
;
