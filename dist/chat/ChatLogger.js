"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatLogger = void 0;
const config_1 = require("../config/config");
const Logger_1 = require("../utils/Logger");
const logger = (0, Logger_1.getLogger)("chat");
class ChatLogger {
    buffer = [];
    db;
    bufferSize;
    channel;
    constructor(db, channel) {
        const config = (0, config_1.loadConfig)();
        this.bufferSize = config.rollingBufferSize;
        this.db = db;
        this.channel = channel;
    }
    addMessage(message) {
        try {
            this.buffer.push(message);
            if (this.buffer.length > this.bufferSize) {
                this.buffer.splice(0, this.buffer.length - this.bufferSize);
            }
            this.db.insertMessage(this.channel, message);
        }
        catch (error) {
            logger.error("Failed to add message", { error });
        }
    }
    getRecent(limit) {
        if (limit <= 0)
            return [];
        const start = Math.max(0, this.buffer.length - limit);
        return this.buffer.slice(start);
    }
}
exports.ChatLogger = ChatLogger;
