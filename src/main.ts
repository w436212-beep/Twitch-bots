import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import { loadConfig } from "./config/config";
import { Database } from "./database/Database";
import { AccountManager } from "./accounts/AccountManager";
import { ChatLogger } from "./chat/ChatLogger";
import { BotManager, BotManagerEvents } from "./bots/BotManager";
import { getLogger } from "./utils/Logger";
import { Account, Message } from "./utils/types";

const logger = getLogger("main");

let mainWindow: BrowserWindow | null = null;
let botManager: BotManager | null = null;
let db: Database | null = null;
let accountManager: AccountManager | null = null;
let chatLogger: ChatLogger | null = null;

const startTime = Date.now();
const messageTimestamps: number[] = [];
let aiCost = 0;
let aiPromptTokens = 0;
let aiCompletionTokens = 0;
let aiRequests = 0;
let aiCacheHits = 0;

const withTimeout = async (promise: Promise<void>, timeoutMs: number): Promise<void> => {
  await Promise.race([
    promise,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  ]);
};

const sendToRenderer = (channel: string, payload: unknown): void => {
  if (!mainWindow) return;
  try {
    mainWindow.webContents.send(channel, payload);
  } catch (error) {
    logger.warn("Failed to send IPC", { channel, error });
  }
};

const sendAccountStatus = (account: Account): void => {
  sendToRenderer("account:statusChanged", account);
};

const sendChatMessage = (message: Message): void => {
  sendToRenderer("chat:newMessage", message);
};

const registerIpcHandlers = (): void => {
  if (!ipcMain || typeof ipcMain.handle !== "function") {
    logger.error("ipcMain is not available; IPC handlers not registered");
    return;
  }

  ipcMain.handle("loadAccounts", async (_event, payload) => {
    try {
      const text = typeof payload === "string" ? payload : "";
      const result = accountManager?.loadFromText(text);
      botManager?.initialize();
      result?.accounts.forEach((account) => sendAccountStatus(account));
      return result ?? { accounts: [], errors: [] };
    } catch (error) {
      logger.error("loadAccounts failed", { error });
      return { accounts: [], errors: [], error: "Failed to load accounts" };
    }
  });

  ipcMain.handle("startBots", async () => {
    try {
      await botManager?.startAll();
      return { ok: true };
    } catch (error) {
      logger.error("startBots failed", { error });
      return { ok: false, error: "Failed to start bots" };
    }
  });

  ipcMain.handle("stopBots", async () => {
    try {
      await botManager?.stopAll();
      return { ok: true };
    } catch (error) {
      logger.error("stopBots failed", { error });
      return { ok: false, error: "Failed to stop bots" };
    }
  });

  ipcMain.handle("sendEmotion", async () => {
    try {
      const maybe = botManager as unknown as { triggerEmotion?: () => Promise<void> };
      if (typeof maybe.triggerEmotion !== "function") {
        return { ok: false, error: "Emotion not available yet" };
      }
      await maybe.triggerEmotion();
      return { ok: true };
    } catch (error) {
      logger.error("sendEmotion failed", { error });
      return { ok: false, error: "Failed to send emotion" };
    }
  });

  ipcMain.handle("bots:broadcast", async (_event, text) => {
    try {
      botManager?.broadcastCustomMessage(String(text ?? ""));
      return { ok: true };
    } catch (error) {
      logger.error("broadcast failed", { error });
      return { ok: false, error: "Failed to broadcast" };
    }
  });

  ipcMain.handle("bots:greeting", async () => {
    try {
      botManager?.triggerGreeting();
      return { ok: true };
    } catch (error) {
      logger.error("greeting failed", { error });
      return { ok: false, error: "Failed to send greeting" };
    }
  });

  ipcMain.handle("config:get", async () => {
    try {
      const config = botManager?.getConfig() ?? loadConfig();
      const safeConfig = { ...config } as any;
      if (safeConfig.openAiApiKey) safeConfig.openAiApiKey = "********";
      if (safeConfig.twitchClientId) safeConfig.twitchClientId = "********";
      if (safeConfig.twitchClientSecret) safeConfig.twitchClientSecret = "********";
      return safeConfig;
    } catch (error) {
      logger.error("config:get failed", { error });
      const safeConfig = loadConfig() as any;
      if (safeConfig.openAiApiKey) safeConfig.openAiApiKey = "********";
      if (safeConfig.twitchClientId) safeConfig.twitchClientId = "********";
      if (safeConfig.twitchClientSecret) safeConfig.twitchClientSecret = "********";
      return safeConfig;
    }
  });

  ipcMain.handle("config:update", async (_event, cfg) => {
    try {
      if (!botManager) return { ok: false };
      const updated = await botManager.updateConfig(cfg ?? {});
      return updated;
    } catch (error) {
      logger.error("config:update failed", { error });
      return { ok: false, error: "Failed to update config" };
    }
  });
};

const createWindow = (): void => {
  const preloadPath = path.join(__dirname, "preload.js");
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const indexPath = path.join(__dirname, "renderer", "index.html");

  if (!fs.existsSync(indexPath)) {
    logger.error("UI index.html not found", { indexPath });
    mainWindow.loadURL("data:text/html,UI%20not%20built").catch(() => {
      logger.error("Failed to load fallback UI");
    });
    return;
  }

  mainWindow.loadFile(indexPath).catch((error) => {
    logger.error("Failed to load UI", { error, indexPath });
    mainWindow?.loadURL("data:text/html,UI%20not%20built");
  });
};

const init = (): void => {
  const config = loadConfig();
  db = new Database(config);
  db.deleteOldCache(24);
  accountManager = new AccountManager();
  chatLogger = new ChatLogger(db, config.channel);

  const events: BotManagerEvents = {
    onAccountStatusChanged: (account) => {
      sendAccountStatus(account);
    },
    onChatMessage: (message) => {
      messageTimestamps.push(message.timestamp);
      sendChatMessage(message);
    }
  };

  botManager = new BotManager(
    accountManager,
    chatLogger,
    events,
    (delta) => {
      aiCost += delta;
      sendToRenderer("ai:cost-increment", { delta, total: aiCost });
    },
    (usage) => {
      aiRequests += 1;
      if (usage.cacheHit) {
        aiCacheHits += 1;
      }
      aiPromptTokens += usage.promptTokens;
      aiCompletionTokens += usage.completionTokens;
      sendToRenderer("ai:usage-update", {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        cacheHit: usage.cacheHit,
        totals: {
          requests: aiRequests,
          cacheHits: aiCacheHits,
          promptTokens: aiPromptTokens,
          completionTokens: aiCompletionTokens
        }
      });
    },
    db ?? undefined,
    (message, type) => {
      sendToRenderer("system:notice", { message, type });
    }
  );

  db.cleanupOldMessages();
  setInterval(() => {
    try {
      db?.cleanupOldMessages();
    } catch (error) {
      logger.warn("Cleanup failed", { error });
    }
  }, 12 * 60 * 60 * 1000);

  registerIpcHandlers();

  setInterval(() => {
    try {
      if (!accountManager || !botManager) return;
      const now = Date.now();
      while (messageTimestamps.length > 0 && now - messageTimestamps[0] > 60_000) {
        messageTimestamps.shift();
      }
      const chatRate = messageTimestamps.length;
      const ramUsageMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      const systemFreeGb = Number((os.freemem() / (1024 * 1024 * 1024)).toFixed(2));
      const cpuLoad1m = Number(os.loadavg()[0].toFixed(2));
      const stats = {
        onlineBots: botManager.getOnlineCount(),
        totalBots: accountManager.getAll().length,
        chatRate,
        aiCost,
        aiPromptTokens,
        aiCompletionTokens,
        aiRequests,
        aiCacheHits,
        ramUsageMb,
        systemFreeGb,
        cpuLoad1m,
        uptimeSec: Math.floor((now - startTime) / 1000)
      };
      sendToRenderer("stats:update", stats);
    } catch (error) {
      logger.warn("stats:update failed", { error });
    }
  }, 2000);

  app.whenReady().then(createWindow).catch(() => {
    app.quit();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  const shutdown = async (): Promise<void> => {
    try {
      if (botManager) {
        await withTimeout(botManager.stopAll(), 5000);
      }
    } finally {
      db?.close();
      app.exit(0);
    }
  };

  app.on("before-quit", () => {
    void shutdown();
  });

  process.on("SIGINT", () => {
    void shutdown();
  });
};

init();
