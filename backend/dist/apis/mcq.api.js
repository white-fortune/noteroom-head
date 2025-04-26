"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mcqApiRouter;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = __importDefault(require("../logger"));
const router = (0, express_1.Router)();
function mcqApiRouter(io) {
    router.use((0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: "Too many requests from a student, please try again later.",
    }));
    router.post("/vote", async (req, res) => {
        try {
            const studentID = req.session?.["stdid"];
            if (!studentID)
                return;
            const { questionID, optionID } = req.body;
            logger_1.default.info(`(/vote): MCQ response attempt for studentID=${studentID || '--studentID--'}, questionID=${questionID || '--questionID--'}, optionID=${optionID || '--optionID--'}`);
            if (!questionID || typeof questionID !== "string") {
                logger_1.default.error(`(/vote): Invalid or missing questionID. studentID=${studentID || '--studentID--'}, optionID=${optionID || '--optionID--'}`);
                return res.json({ ok: false, message: "questionID is required and must be a string." });
            }
            if (!optionID || typeof optionID !== "string") {
                logger_1.default.error(`(/vote): Invalid or missing optionID. studentID=${studentID}, questionID=${questionID}`);
                return res.json({ ok: false, message: "optionID is required and must be a string." });
            }
            const [selectedOption, optionQuestionID] = optionID.split(":");
            if (!selectedOption || !optionQuestionID) {
                logger_1.default.error(`(/vote): optionID format mismatch. studentID=${studentID}, optionID=${optionID}`);
                return res.json({
                    ok: false,
                    message: "optionID must be in format '<option>:<questionID>'",
                });
            }
            if (!/^[A-D]$/.test(selectedOption)) {
                logger_1.default.error(`(/vote): Invalid option character '${selectedOption}'. studentID=${studentID}, questionID=${questionID}`);
                return res.json({
                    ok: false,
                    message: "Option must be between A to D.",
                });
            }
            if (optionQuestionID !== questionID) {
                logger_1.default.error(`(/vote): optionID questionID part does not match. studentID=${studentID}, optionID=${optionID}, questionID=${questionID}`);
                return res.json({
                    ok: false,
                    message: "optionID questionID part does not match the provided questionID.",
                });
            }
            const existingVote = { selectedOption: "A" };
            if (existingVote) {
                if (existingVote.selectedOption === selectedOption) {
                    logger_1.default.info(`(/vote): Unvoting same option. studentID=${studentID}, questionID=${questionID}, option=${selectedOption}`);
                    return res.json({
                        ok: true,
                        message: "You already voted the selected option.",
                    });
                }
                else {
                    logger_1.default.info(`(/vote): Changed vote. studentID=${studentID}, questionID=${questionID}, from=${existingVote.selectedOption} to=${selectedOption}`);
                    return res.json({
                        ok: true,
                        message: `You have changed your vote to option ${selectedOption}.`,
                    });
                }
            }
            else {
                logger_1.default.info(`(/vote): New vote. studentID=${studentID}, questionID=${questionID}, option=${selectedOption}`);
                return res.json({
                    ok: true,
                    message: `You have voted for option ${selectedOption}.`,
                });
            }
        }
        catch (err) {
            logger_1.default.error(`(/vote): MCQ vote processing failed for studentID=${req.body?.studentID || '--studentID--'}, questionID=${req.body?.questionID || '--questionID--'}, optionID=${req.body?.optionID || '--optionID--'}: ${err}`);
            return res.json({
                ok: false,
                message: "MCQ vote processing failed",
            });
        }
    });
    return router;
}
