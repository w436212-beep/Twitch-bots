"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config/config");
const Database_1 = require("./database/Database");
const AccountManager_1 = require("./accounts/AccountManager");
const ChatLogger_1 = require("./chat/ChatLogger");
const BotManager_1 = require("./bots/BotManager");
const Logger_1 = require("./utils/Logger");
const logger = (0, Logger_1.getLogger)("main");
let mainWindow = null;
let botManager = null;
let db = null;
let accountManager = null;
let chatLogger = null;
const startTime = Date.now();
const messageTimestamps = [];
let aiCost = 0;
const withTimeout = async (promise, timeoutMs) => {
    await Promise.race([
        promise,
        new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ]);
};
const sendToRenderer = (channel, payload) => {
    if (!mainWindow)
        return;
    try {
        mainWindow.webContents.send(channel, payload);
    }
    catch (error) {
        logger.warn("Failed to send IPC", { channel, error });
    }
};
const sendAccountStatus = (account) => {
    sendToRenderer("account:statusChanged", account);
};
const sendChatMessage = (message) => {
    sendToRenderer("chat:newMessage", message);
};
const registerIpcHandlers = () => {
    if (!electron_1.ipcMain || typeof electron_1.ipcMain.handle !== "function") {
        logger.error("ipcMain is not available; IPC handlers not registered");
        return;
    }
    electron_1.ipcMain.handle("loadAccounts", async (_event, payload) => {
        try {
            const text = typeof payload === "string" ? payload : "";
            const result = accountManager?.loadFromText(text);
            botManager?.initialize();
            result?.accounts.forEach((account) => sendAccountStatus(account));
            return result ?? { accounts: [], errors: [] };
        }
        catch (error) {
            logger.error("loadAccounts failed", { error });
            return { accounts: [], errors: [], error: "Failed to load accounts" };
        }
    });
    electron_1.ipcMain.handle("startBots", async () => {
        try {
            await botManager?.startAll();
            return { ok: true };
        }
        catch (error) {
            logger.error("startBots failed", { error });
            return { ok: false, error: "Failed to start bots" };
        }
    });
    electron_1.ipcMain.handle("stopBots", async () => {
        try {
            await botManager?.stopAll();
            return { ok: true };
        }
        catch (error) {
            logger.error("stopBots failed", { error });
            return { ok: false, error: "Failed to stop bots" };
        }
    });
    electron_1.ipcMain.handle("sendEmotion", async () => {
        try {
            const maybe = botManager;
            if (typeof maybe.triggerEmotion !== "function") {
                return { ok: false, error: "Emotion not available yet" };
            }
            await maybe.triggerEmotion();
            return { ok: true };
        }
        catch (error) {
            logger.error("sendEmotion failed", { error });
            return { ok: false, error: "Failed to send emotion" };
        }
    });
    electron_1.ipcMain.handle("bots:broadcast", async (_event, text) => {
        try {
            botManager?.broadcastCustomMessage(String(text ?? ""));
            return { ok: true };
        }
        catch (error) {
            logger.error("broadcast failed", { error });
            return { ok: false, error: "Failed to broadcast" };
        }
    });
    electron_1.ipcMain.handle("bots:greeting", async () => {
        try {
            botManager?.triggerGreeting();
            return { ok: true };
        }
        catch (error) {
            logger.error("greeting failed", { error });
            return { ok: false, error: "Failed to send greeting" };
        }
    });
    electron_1.ipcMain.handle("config:get", async () => {
        try {
            return botManager?.getConfig() ?? (0, config_1.loadConfig)();
        }
        catch (error) {
            logger.error("config:get failed", { error });
            return (0, config_1.loadConfig)();
        }
    });
    electron_1.ipcMain.handle("config:update", async (_event, cfg) => {
        try {
            if (!botManager)
                return { ok: false };
            const updated = await botManager.updateConfig(cfg ?? {});
            return updated;
        }
        catch (error) {
            logger.error("config:update failed", { error });
            return { ok: false, error: "Failed to update config" };
        }
    });
};
const createWindow = () => {
    const preloadPath = path_1.default.join(__dirname, "preload.js");
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    const indexPath = path_1.default.join(__dirname, "renderer", "index.html");
    if (!fs_1.default.existsSync(indexPath)) {
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
const init = () => {
    const config = (0, config_1.loadConfig)();
    db = new Database_1.Database(config);
    accountManager = new AccountManager_1.AccountManager();
    chatLogger = new ChatLogger_1.ChatLogger(db, config.channel);
    const events = {
        onAccountStatusChanged: (account) => {
            sendAccountStatus(account);
        },
        onChatMessage: (message) => {
            messageTimestamps.push(message.timestamp);
            sendChatMessage(message);
        }
    };
    botManager = new BotManager_1.BotManager(accountManager, chatLogger, events);
    db.cleanupOldMessages();
    setInterval(() => {
        try {
            db?.cleanupOldMessages();
        }
        catch (error) {
            logger.warn("Cleanup failed", { error });
        }
    }, 12 * 60 * 60 * 1000);
    registerIpcHandlers();
    setInterval(() => {
        try {
            if (!accountManager || !botManager)
                return;
            const now = Date.now();
            while (messageTimestamps.length > 0 && now - messageTimestamps[0] > 60_000) {
                messageTimestamps.shift();
            }
            const chatRate = messageTimestamps.length;
            const stats = {
                onlineBots: botManager.getOnlineCount(),
                totalBots: accountManager.getAll().length,
                chatRate,
                aiCost,
                uptimeSec: Math.floor((now - startTime) / 1000)
            };
            sendToRenderer("stats:update", stats);
        }
        catch (error) {
            logger.warn("stats:update failed", { error });
        }
    }, 2000);
    electron_1.app.whenReady().then(createWindow).catch(() => {
        electron_1.app.quit();
    });
    electron_1.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron_1.app.quit();
        }
    });
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    const shutdown = async () => {
        try {
            if (botManager) {
                await withTimeout(botManager.stopAll(), 5000);
            }
        }
        finally {
            db?.close();
            electron_1.app.exit(0);
        }
    };
    electron_1.app.on("before-quit", () => {
        void shutdown();
    });
    process.on("SIGINT", () => {
        void shutdown();
    });
};
init();
