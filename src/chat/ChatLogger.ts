import { Message } from "../utils/types";
import { Database } from "../database/Database";
import { loadConfig } from "../config/config";
import { getLogger } from "../utils/Logger";

const logger = getLogger("chat");

export class ChatLogger {
  private buffer: Message[] = [];
  private readonly db: Database;
  private readonly bufferSize: number;
  private readonly channel: string;

  constructor(db: Database, channel: string) {
    const config = loadConfig();
    this.bufferSize = config.rollingBufferSize;
    this.db = db;
    this.channel = channel;
  }

  addMessage(message: Message): void {
    try {
      this.buffer.push(message);
      if (this.buffer.length > this.bufferSize) {
        this.buffer.splice(0, this.buffer.length - this.bufferSize);
      }
      this.db.insertMessage(this.channel, message);
    } catch (error) {
      logger.error("Failed to add message", { error });
    }
  }

  getRecent(limit: number): Message[] {
    if (limit <= 0) return [];
    const start = Math.max(0, this.buffer.length - limit);
    return this.buffer.slice(start);
  }
}
