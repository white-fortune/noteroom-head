"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = profileApiRouter;
const express_1 = require("express");
const userService_1 = require("../services/userService");
const router = (0, express_1.Router)();
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
    return router;
}
