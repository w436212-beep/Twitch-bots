"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const config_1 = require("../config/config");
const maskSecrets = (input) => {
    const patterns = [
        /(oauth:)[a-zA-Z0-9]+/g,
        /(password=)[^\s&]+/gi,
        /(api[_-]?key=)[^\s&]+/gi,
        /(token=)[^\s&]+/gi
    ];
    return patterns.reduce((acc, regex) => acc.replace(regex, "$1***"), input);
};
const formatMessage = (info) => {
    const timestamp = info.timestamp ?? new Date().toISOString();
    const level = info.level;
    const moduleName = info.module ?? "app";
    const message = typeof info.message === "string" ? maskSecrets(info.message) : "";
    const meta = info.meta ? JSON.stringify(info.meta) : "";
    return `${timestamp} [${level}] [${moduleName}] ${message} ${meta}`.trim();
};
const ensureLogDir = (dir) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
};
const getLogger = (moduleName) => {
    const config = (0, config_1.loadConfig)();
    const logDir = path_1.default.resolve(process.cwd(), config.logDir);
    ensureLogDir(logDir);
    return winston_1.default.createLogger({
        level: "info",
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format((info) => {
            info.module = moduleName;
            return info;
        })()),
        transports: [
            new winston_1.default.transports.Console({
                format: winston_1.default.format.printf(formatMessage)
            }),
            new winston_daily_rotate_file_1.default({
                dirname: logDir,
                filename: `${moduleName}-%DATE%.log`,
                datePattern: "YYYY-MM-DD",
                maxSize: "10m",
                maxFiles: "5",
                options: { encoding: "utf8" },
                format: winston_1.default.format.printf(formatMessage)
            })
        ]
    });
};
exports.getLogger = getLogger;
