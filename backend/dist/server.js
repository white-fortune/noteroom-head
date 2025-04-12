"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSocketMap = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = require("path");
const dotenv_1 = require("dotenv");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const mongoose_1 = require("mongoose");
const body_parser_1 = __importDefault(require("body-parser"));
const { urlencoded } = body_parser_1.default;
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const cors_1 = __importDefault(require("cors"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const { create } = connect_mongo_1.default;
const chalk_1 = __importDefault(require("chalk"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swaggerOptions_1 = __importDefault(require("./swaggers/swaggerOptions"));
const post_js_1 = __importDefault(require("./services/apis/post.js"));
const feed_js_1 = __importDefault(require("./services/apis/feed.js"));
const search_js_1 = __importDefault(require("./services/apis/search.js"));
const profile_js_1 = __importDefault(require("./services/apis/profile.js"));
const notifications_js_1 = __importDefault(require("./services/apis/notifications.js"));
const requests_js_1 = __importDefault(require("./services/apis/requests.js"));
const auth_js_1 = __importDefault(require("./services/apis/auth.js"));
const upload_js_1 = __importDefault(require("./services/apis/upload.js"));
(0, dotenv_1.config)({ path: (0, path_1.join)(__dirname, '.env') });
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
const url = (process.env.DEVELOPMENT && process.env.DEVELOPMENT === "true") ? process.env.MONGO_URI_DEV : process.env.MONGO_URI;
(0, mongoose_1.connect)(url).then(() => {
    console.log(chalk_1.default.cyan(`[-] development mode: ${chalk_1.default.yellow(process.env.DEVELOPMENT)}`));
    if (process.env.DEVELOPMENT && process.env.DEVELOPMENT === "true") {
        console.log(chalk_1.default.cyan(`[-] using local mongodb: ${chalk_1.default.yellow(url)}`));
    }
    else {
        console.log(chalk_1.default.cyan(`[-] using remote mongodb: ${chalk_1.default.yellow(url)}`));
    }
});
const port = process.env.PORT;
const staticPath = (0, path_1.join)(__dirname, "../../frontend/dist");
const allowedHosts = JSON.parse(process.env.ALLOWED_HOSTS);
app.use((0, cors_1.default)({
    origin: allowedHosts,
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.static(staticPath));
app.use(urlencoded({ extended: true }));
app.use((0, express_session_1.default)({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: create({
        mongoUrl: url,
        ttl: 60 * 60 * 720
    }),
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 720
    }
}));
app.use((0, cookie_parser_1.default)());
app.use((0, express_fileupload_1.default)());
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerOptions_1.default));
app.use('/api/users', (0, profile_js_1.default)(io));
app.use('/api/posts', (0, post_js_1.default)(io));
app.use('/api/notifications', (0, notifications_js_1.default)(io));
app.use('/api/requests', (0, requests_js_1.default)(io));
app.use('/api/feed', (0, feed_js_1.default)(io));
app.use('/api/search', (0, search_js_1.default)(io));
app.use('/api/auth', (0, auth_js_1.default)(io));
app.use('/api/upload', (0, upload_js_1.default)(io));
app.get('/logout', (req, res) => {
    try {
        req.session.destroy(error => {
            res.clearCookie('studentID');
            res.clearCookie('username');
            res.clearCookie('connect.sid');
            res.json({ ok: true });
        });
    }
    catch (error) {
        res.json({ ok: false });
    }
});
app.get("/support", (req, res) => {
    res.sendFile((0, path_1.join)(staticPath, "support.html"));
});
app.get("*", (req, res) => {
    res.sendFile((0, path_1.join)(staticPath, 'index.html'));
});
exports.userSocketMap = new Map();
io.on('connection', (socket) => {
    let studentID = socket.handshake.query.studentID;
    if (studentID) {
        exports.userSocketMap.set(studentID, socket.id);
    }
    socket.on('disconnect', () => {
        exports.userSocketMap.forEach((sockID, studentID) => {
            if (sockID === socket.id) {
                exports.userSocketMap.delete(studentID);
            }
        });
    });
});
server.listen(port, () => {
    console.log(chalk_1.default.cyan(`[-] server is listening on: ${chalk_1.default.yellow(`http://localhost:${port}`)}`));
});
