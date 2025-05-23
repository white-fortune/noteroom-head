"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
exports.default = seacrhApiRouter;
const express_1 = require("express");
const userService_1 = require("../services/userService");
const postService_1 = require("../services/postService");
exports.router = (0, express_1.Router)();
function seacrhApiRouter(io) {
    exports.router.get("/", async (req, res) => {
        try {
            if (req.query) {
                const term = req.query.q;
                const type = req.query.type;
                const countDoc = req.query.countdoc ? true : false;
                let batch = Number(req.query.batch || "1");
                let maxCount = 20;
                let skip = (batch - 1) * maxCount;
                if (type === "profiles") {
                    const students = await (0, userService_1.searchStudent)(term, { maxCount: maxCount, skip: skip, countDoc });
                    res.json(students);
                }
                else if (type === "posts") {
                    const response = await (0, postService_1.searchPosts)(term);
                    if (response.ok) {
                        res.json({ ok: true, posts: response.posts });
                    }
                    else {
                        res.json({ ok: false });
                    }
                }
            }
        }
        catch (error) {
            res.json({ ok: false });
        }
    });
    return exports.router;
}
