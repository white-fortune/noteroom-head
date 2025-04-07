"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
const chalk_1 = __importDefault(require("chalk"));
(0, dotenv_1.config)({ path: path_1.default.join(__dirname, '../../.env') });
const logFile = path_1.default.join(__dirname, '../../../logs/nrlogs.log');
const errorLogFile = path_1.default.join(__dirname, '../../../logs/nr_errorlogs.log');
console.log(chalk_1.default.cyan(`[-] log state: ${chalk_1.default.yellow(process.env.LOG_STATE)}; log save: ${chalk_1.default.yellow(process.env.LOG_SAVE)}`));
const logger = winston_1.default.createLogger({
    level: process.env.LOG_STATE && process.env.LOG_STATE === "print" ? "info" : "silent",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message }) => {
        return `${(new Date(String(timestamp))).toString()} [${level.toUpperCase()}]: ${message}`;
    })),
    transports: [
        new winston_1.default.transports.Console()
    ]
});
if (process.env.LOG_SAVE && process.env.LOG_SAVE === "true") {
    logger.add(new winston_1.default.transports.File({ filename: logFile }));
    logger.add(new winston_1.default.transports.File({ filename: errorLogFile, level: "error" }));
}
exports.default = logger;
