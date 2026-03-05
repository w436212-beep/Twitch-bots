import { Database } from "../../src/database/Database";
import { Message } from "../../src/utils/types";
import path from "path";
import fs from "fs";

describe("Database", () => {
  let db: Database;
  const dbPath = path.resolve(__dirname, "test-database.db");

  beforeEach(() => {
    // Override the loaded config
    db = new Database({
      databasePath: dbPath,
      cleanupDays: 7
    } as any);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it("should initialize schema", () => {
    // Verification done implicitly if no exceptions are thrown during init
    expect(db).toBeDefined();
  });

  it("should insert and retrieve recent messages", () => {
    const msg: Message = {
      author: "user1",
      text: "hello",
      timestamp: Date.now(),
      mentions: [],
      isStreamer: false,
      isBot: false,
    };

    db.insertMessage("testchannel", msg);

    const recent = db.getRecentMessages(1);
    expect(recent).toHaveLength(1);
    expect(recent[0].author).toBe("user1");
    expect(recent[0].text).toBe("hello");
  });

  it("should clear old messages", () => {
    const oldMsg: Message = {
      author: "olduser",
      text: "old",
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      mentions: [],
      isStreamer: false,
      isBot: false,
    };

    db.insertMessage("testchannel", oldMsg);

    const count = db.cleanupOldMessages();
    expect(count).toBe(1);

    const recent = db.getRecentMessages(10);
    expect(recent).toHaveLength(0);
  });

  it("should set and retrieve AI cache", () => {
    db.setAiCache("hash1", "prompt1", "response1", Date.now(), 60000);
    const cached = db.getAiCache("hash1", Date.now());
    expect(cached).toBe("response1");
  });

  it("should return null for expired AI cache", () => {
    db.setAiCache("hash2", "prompt2", "response2", Date.now() - 120000, 60000); // Created in past, expired
    const cached = db.getAiCache("hash2", Date.now());
    expect(cached).toBeNull();
  });
});
