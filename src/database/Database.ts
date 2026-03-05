import path from "path";
import fs from "fs";
import DatabaseDriver from "better-sqlite3";
import { AppConfig, Message } from "../utils/types";
import { loadConfig } from "../config/config";
import { getLogger } from "../utils/Logger";

const logger = getLogger("database");

export class Database {
  private db: DatabaseDriver.Database;
  private config: AppConfig;

  constructor(config?: AppConfig) {
    this.config = config ?? loadConfig();
    const dbPath = path.resolve(process.cwd(), this.config.databasePath);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseDriver(dbPath, { timeout: 15000 });
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.initSchema();
  }

  private initSchema(): void {
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

        CREATE TABLE IF NOT EXISTS ai_cache (
          prompt_hash TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          response TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);
      `);
    } catch (error) {
      logger.error("Failed to initialize database schema", { error });
      throw error;
    }
  }

  insertMessage(channel: string, message: Message): void {
    try {
      const stmt = this.db.prepare(
        `INSERT INTO messages (channel, author, text, timestamp, mentions, is_streamer, is_bot)
         VALUES (@channel, @author, @text, @timestamp, @mentions, @is_streamer, @is_bot)`
      );
      stmt.run({
        channel,
        author: message.author,
        text: message.text,
        timestamp: message.timestamp,
        mentions: JSON.stringify(message.mentions),
        is_streamer: message.isStreamer ? 1 : 0,
        is_bot: message.isBot ? 1 : 0
      });
    } catch (error) {
      logger.error("Failed to insert message", { error });
    }
  }

  getRecentMessages(limit: number): Message[] {
    try {
      const stmt = this.db.prepare(
        `SELECT author, text, timestamp, mentions, is_streamer, is_bot FROM messages
         ORDER BY timestamp DESC LIMIT ?`
      );
      const rows = stmt.all(limit) as Array<{
        author: string;
        text: string;
        timestamp: number;
        mentions: string;
        is_streamer: number;
        is_bot: number;
      }>;
      return rows.map((row) => ({
        author: row.author,
        text: row.text,
        timestamp: row.timestamp,
        mentions: JSON.parse(row.mentions) as string[],
        isStreamer: row.is_streamer === 1,
        isBot: row.is_bot === 1
      }));
    } catch (error) {
      logger.error("Failed to load recent messages", { error });
      return [];
    }
  }

  cleanupOldMessages(): number {
    const cutoff = Date.now() - this.config.cleanupDays * 24 * 60 * 60 * 1000;
    try {
      const stmt = this.db.prepare(`DELETE FROM messages WHERE timestamp < ?`);
      const result = stmt.run(cutoff);
      return result.changes ?? 0;
    } catch (error) {
      logger.error("Failed to cleanup old messages", { error });
      return 0;
    }
  }

  getAiCache(promptHash: string, nowMs: number): string | null {
    try {
      const stmt = this.db.prepare(
        `SELECT response, expires_at FROM ai_cache WHERE prompt_hash = ?`
      );
      const row = stmt.get(promptHash) as { response: string; expires_at: number } | undefined;
      if (!row) return null;
      if (row.expires_at <= nowMs) {
        this.db.prepare(`DELETE FROM ai_cache WHERE prompt_hash = ?`).run(promptHash);
        return null;
      }
      return row.response;
    } catch (error) {
      logger.error("Failed to read ai cache", { error });
      return null;
    }
  }

  setAiCache(promptHash: string, prompt: string, response: string, nowMs: number, ttlMs: number): void {
    try {
      const expiresAt = nowMs + ttlMs;
      const stmt = this.db.prepare(
        `INSERT INTO ai_cache (prompt_hash, prompt, response, created_at, expires_at)
         VALUES (@prompt_hash, @prompt, @response, @created_at, @expires_at)
         ON CONFLICT(prompt_hash) DO UPDATE SET
           response = excluded.response,
           created_at = excluded.created_at,
           expires_at = excluded.expires_at,
           prompt = excluded.prompt`
      );
      stmt.run({
        prompt_hash: promptHash,
        prompt,
        response,
        created_at: nowMs,
        expires_at: expiresAt
      });
    } catch (error) {
      logger.error("Failed to write ai cache", { error });
    }
  }

  close(): void {
    try {
      this.db.close();
    } catch (error) {
      logger.error("Failed to close database", { error });
    }
  }

  /**
   * Removes AI cache entries older than the specified number of hours.
   */
  deleteOldCache(hours = 24): void {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    try {
      const stmt = this.db.prepare("DELETE FROM ai_cache WHERE created_at < ?");
      stmt.run(cutoff);
    } catch (error) {
      logger.error("Failed to cleanup ai cache", { error });
    }
  }
}
