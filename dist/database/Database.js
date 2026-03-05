"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const config_1 = require("../config/config");
const Logger_1 = require("../utils/Logger");
const logger = (0, Logger_1.getLogger)("database");
class Database {
    db;
    config;
    constructor(config) {
        this.config = config ?? (0, config_1.loadConfig)();
        const dbPath = path_1.default.resolve(process.cwd(), this.config.databasePath);
        const dir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.initSchema();
    }
    initSchema() {
        try {
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel TEXT NOT NULL,
          author TEXT NOT NULL,
          text TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          mentions TEXT NOT NULL,
          is_streamer INTEGER NOT NULL,
          is_bot INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author);
      `);
        }
        catch (error) {
            logger.error("Failed to initialize database schema", { error });
            throw error;
        }
    }
    insertMessage(channel, message) {
        try {
            const stmt = this.db.prepare(`INSERT INTO messages (channel, author, text, timestamp, mentions, is_streamer, is_bot)
         VALUES (@channel, @author, @text, @timestamp, @mentions, @is_streamer, @is_bot)`);
            stmt.run({
                channel,
                author: message.author,
                text: message.text,
                timestamp: message.timestamp,
                mentions: JSON.stringify(message.mentions),
                is_streamer: message.isStreamer ? 1 : 0,
                is_bot: message.isBot ? 1 : 0
            });
        }
        catch (error) {
            logger.error("Failed to insert message", { error });
        }
    }
    getRecentMessages(limit) {
        try {
            const stmt = this.db.prepare(`SELECT author, text, timestamp, mentions, is_streamer, is_bot FROM messages
         ORDER BY timestamp DESC LIMIT ?`);
            const rows = stmt.all(limit);
            return rows.map((row) => ({
                author: row.author,
                text: row.text,
                timestamp: row.timestamp,
                mentions: JSON.parse(row.mentions),
                isStreamer: row.is_streamer === 1,
                isBot: row.is_bot === 1
            }));
        }
        catch (error) {
            logger.error("Failed to load recent messages", { error });
            return [];
        }
    }
    cleanupOldMessages() {
        const cutoff = Date.now() - this.config.cleanupDays * 24 * 60 * 60 * 1000;
        try {
            const stmt = this.db.prepare(`DELETE FROM messages WHERE timestamp < ?`);
            const result = stmt.run(cutoff);
            return result.changes ?? 0;
        }
        catch (error) {
            logger.error("Failed to cleanup old messages", { error });
            return 0;
        }
    }
    close() {
        try {
            this.db.close();
        }
        catch (error) {
            logger.error("Failed to close database", { error });
        }
    }
}
exports.Database = Database;
