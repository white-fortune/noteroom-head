"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_CHANGEABLE_FIELDS = void 0;
exports.default = profileApiRouter;
const express_1 = require("express");
const userService_1 = require("../services/userService");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const logger_1 = __importDefault(require("../logger"));
const router = (0, express_1.Router)();
exports.ALLOWED_CHANGEABLE_FIELDS = [
    "displayname",
    "bio",
    "rollnumber",
    "favouritesubject",
    "notfavsubject",
    "group",
    "collegeyear"
];
function profileApiRouter(io) {
    router.get("/mutual-college", async (req, res) => {
        try {
            let studentID = req.session["stdid"];
            let studentDocID = (await userService_1.Convert.getDocumentID_studentid(studentID)).toString();
            let countDoc = req.query.countdoc ? true : false;
            let batch = Number(req.query.batch || "1");
            let count = 15;
            let skip = (batch - 1) * count;
            let profiles = await (0, userService_1.getMutualCollegeStudents)(studentDocID, { count: count, skip: skip, countDoc });
            res.json(profiles);
        }
        catch (error) {
            res.json([]);
        }
    });
    router.get("/:username", async (req, res) => {
        try {
            if (req.params.username) {
                let username = req.params.username;
                let visiterStudentID = req.session["stdid"];
                let profileStudentID = await userService_1.Convert.getStudentID_username(username);
                let profile = await (0, userService_1.getProfile)(username);
                if (profile.ok) {
                    res.json({ ok: true, profile: { ...profile.student, owner: visiterStudentID === profileStudentID } });
                }
                else {
                    res.json({ ok: false, message: "Sorry, nobody on NoteRoom goes by that name." });
                }
            }
            else {
                res.json({ ok: false, message: "Page not found!" });
            }
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    router.post("/change", async (req, res) => {
        try {
            const studentID = req.session?.["stdid"];
            if (!studentID)
                return;
            const group = req.body.group?.trim();
            if (!group || !["Science", "Commerce", "Arts"].includes(group)) {
                logger_1.default.warn(`Invalid or missing group for student ${studentID}: ${group}`);
                return res.json({ ok: false, message: "Invalid or missing group." });
            }
            logger_1.default.info(`Student ID: ${studentID}, Group: ${group}`);
            const updates = {};
            for (const key in req.body) {
                const rawValue = req.body[key];
                const value = (0, sanitize_html_1.default)(rawValue || "").trim();
                if (!exports.ALLOWED_CHANGEABLE_FIELDS.includes(key)) {
                    logger_1.default.warn(`Unauthorized change attempt on field: ${key} by student ${studentID}`);
                    return res.json({ ok: false, message: `Field "${key}" is not allowed to be changed.` });
                }
                if (!value) {
                    logger_1.default.warn(`Empty value submitted for "${key}" by student ${studentID}`);
                    return res.json({ ok: false, message: `Value for "${key}" cannot be empty.` });
                }
                updates[key] = value;
            }
            if (Object.keys(updates).length === 0) {
                return res.json({ ok: false, message: "No valid changes provided." });
            }
            const response = await (0, userService_1.updateProfileFields)(studentID, updates);
            if (response.ok) {
                logger_1.default.info(`Profile updated successfully for student ${studentID}`);
                res.json({ ok: true });
            }
            else {
                logger_1.default.error(`Update failed for student ${studentID}`);
                res.json({ ok: false, message: "Can't change your profile details now! Please try again a bit later" });
            }
        }
        catch (error) {
            logger_1.default.error(`Exception occurred during profile change: ${error}`);
            res.json({ ok: false, message: "An error occurred while updating profile." });
        }
    });
    return router;
}
