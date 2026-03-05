"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndividualBot = void 0;
const tmi_js_1 = __importDefault(require("tmi.js"));
const types_1 = require("../utils/types");
const RateLimiter_1 = require("../utils/RateLimiter");
const Logger_1 = require("../utils/Logger");
const config_1 = require("../config/config");
const BrowserProfile_1 = require("../utils/BrowserProfile");
const logger = (0, Logger_1.getLogger)("bots");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class IndividualBot {
    client = null;
    account;
    channel;
    viewerService;
    rateLimiter;
    events;
    typingDelayMin;
    typingDelayMax;
    debugEnabled;
    isViewing = false;
    isStopping = false;
    scheduler = null;
    messageTimer = null;
    eventsAttached = false;
    isConnecting = false;
    constructor(account, viewerService, events = {}, scheduler, debugEnabled = false) {
        const config = (0, config_1.loadConfig)();
        this.account = account;
        this.channel = config.channel;
        this.viewerService = viewerService;
        this.rateLimiter = new RateLimiter_1.RateLimiter({
            capacity: 20,
            refillTokens: 20,
            refillIntervalMs: 30_000
        });
        this.events = events;
        this.typingDelayMin = config.typingDelayMinMs;
        this.typingDelayMax = config.typingDelayMaxMs;
        this.debugEnabled = debugEnabled;
        if (scheduler)
            this.scheduler = scheduler;
    }
    setScheduler(scheduler) {
        this.scheduler = scheduler;
    }
    getId() {
        return this.account.username;
    }
    getUsername() {
        return this.account.username;
    }
    getState() {
        return {
            id: this.account.username,
            account: this.account,
            client: this.client,
            lastMessageTime: 0,
            cooldownSeconds: (0, config_1.loadConfig)().messageCooldownSeconds,
            awaitingReply: false,
            conversationContext: [],
            rateLimiter: this.rateLimiter
        };
    }
    async connect() {
        if (this.isConnecting)
            return;
        this.isConnecting = true;
        this.account.status = types_1.AccountStatus.Connecting;
        const tokenPreview = this.account.oauth.replace(/^oauth:/, "").slice(0, 10);
        const channel = this.channel;
        logger.info("Creating tmi client", {
            username: this.account.username,
            channel,
            tokenPreview: `oauth:${tokenPreview}...`
        });
        if (!channel) {
            logger.error("Channel is empty, cannot connect", { user: this.account.username });
            this.account.status = types_1.AccountStatus.Error;
            this.account.lastError = "Channel not set";
            this.events.onDisconnected?.(this.emitStatus(), "channel_empty");
            this.isConnecting = false;
            return;
        }
        logger.info("Connecting to channel", { user: this.account.username, channel });
        if (this.client) {
            try {
                await this.client.disconnect();
            }
            catch {
                // ignore
            }
            try {
                this.client.removeAllListeners();
            }
            catch {
                // ignore
            }
            this.client = null;
            this.eventsAttached = false;
        }
        this.client = new tmi_js_1.default.Client({
            options: { debug: this.debugEnabled },
            identity: {
                username: this.account.username,
                password: this.account.oauth
            },
            channels: [channel]
        });
        this.wireEvents(this.client);
        try {
            await this.client.connect();
            this.account.status = types_1.AccountStatus.Online;
            this.account.connectedAt = Date.now();
            this.events.onConnected?.(this.emitStatus());
            if ((0, config_1.loadConfig)().viewbotEnabled) {
                void this.startViewerMode();
            }
            this.startMessageLoop();
        }
        catch (error) {
            this.account.status = types_1.AccountStatus.Error;
            this.account.lastError = error.message;
            logger.error("Bot connect failed", { error, user: this.account.username });
            this.events.onDisconnected?.(this.emitStatus(), "connect_failed");
        }
        finally {
            this.isConnecting = false;
        }
    }
    async disconnect() {
        if (!this.client)
            return;
        this.isStopping = true;
        this.stopMessageLoop();
        if (this.isViewing) {
            await this.viewerService.stopViewing(this.account.username);
            this.isViewing = false;
            this.account.isViewing = false;
        }
        try {
            await this.client.disconnect();
            this.account.status = types_1.AccountStatus.Idle;
        }
        catch (error) {
            logger.warn("Bot disconnect failed", { error, user: this.account.username });
        }
        finally {
            try {
                this.client.removeAllListeners();
            }
            catch {
                // ignore
            }
            this.isStopping = false;
            this.eventsAttached = false;
            this.client = null;
        }
    }
    async sendImmediate(text, skipTypingDelay = true) {
        if (!this.client)
            return;
        try {
            if (!skipTypingDelay) {
                await this.applyTypingDelay();
            }
            logger.info("Immediate send attempt", {
                user: this.account.username,
                channel: this.channel,
                text,
                readyState: this.getReadyState()
            });
            await this.client.say(this.channel, text);
            logger.info("Immediate send success", { user: this.account.username });
            this.account.messagesSent += 1;
            this.account.lastActive = Date.now();
            this.scheduler?.recordGlobalMessage();
            this.scheduler?.onMessageSent?.(this, text);
        }
        catch (error) {
            logger.error("Immediate send failed", { error, user: this.account.username });
        }
    }
    startMessageLoop() {
        if (this.messageTimer)
            return;
        const schedule = () => {
            if (this.isStopping || !this.client)
                return;
            const delay = this.getCooldownMs();
            this.messageTimer = setTimeout(() => {
                void this.loopTick();
            }, delay);
        };
        schedule();
    }
    stopMessageLoop() {
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
            this.messageTimer = null;
        }
    }
    async loopTick() {
        try {
            await this.tryToSendMessage();
        }
        catch (error) {
            logger.error("Message loop error", { error, user: this.account.username });
        }
        finally {
            if (!this.isStopping && this.client) {
                this.messageTimer = null;
                this.startMessageLoop();
            }
        }
    }
    async tryToSendMessage() {
        if (!this.client || !this.scheduler)
            return;
        if (!this.rateLimiter.canConsume(1)) {
            this.scheduler.onMessageSkipped?.(this, "rate_limit");
            logger.debug("Skip message: rate limit", { user: this.account.username });
            return;
        }
        if (!this.scheduler.canSendGlobally()) {
            this.scheduler.onMessageSkipped?.(this, "global_limit");
            logger.debug("Skip message: global limit", { user: this.account.username });
            return;
        }
        const text = await this.scheduler.generateMessage(this);
        if (!text) {
            this.scheduler.onMessageSkipped?.(this, "no_text");
            logger.debug("Skip message: no text", { user: this.account.username });
            return;
        }
        if (!this.rateLimiter.consume(1)) {
            this.scheduler.onMessageSkipped?.(this, "rate_limit");
            logger.debug("Skip message: rate limit after check", { user: this.account.username });
            return;
        }
        await this.applyTypingDelay();
        logger.info("Send attempt", {
            user: this.account.username,
            channel: this.channel,
            text,
            readyState: this.getReadyState()
        });
        try {
            await this.client.say(this.channel, text);
            logger.info("Send success", { user: this.account.username });
            this.account.messagesSent += 1;
            this.account.lastActive = Date.now();
            this.scheduler.recordGlobalMessage();
            this.scheduler.onMessageSent?.(this, text);
        }
        catch (error) {
            logger.error("Send message failed", { error, user: this.account.username });
        }
    }
    getCooldownMs() {
        const config = (0, config_1.loadConfig)();
        const min = Math.min(config.messageCooldownMinSeconds, config.messageCooldownMaxSeconds);
        const max = Math.max(config.messageCooldownMinSeconds, config.messageCooldownMaxSeconds);
        const seconds = Math.floor(min + Math.random() * (max - min + 1));
        return seconds * 1000;
    }
    getReadyState() {
        const clientAny = this.client;
        if (clientAny && typeof clientAny.readyState === "function") {
            const state = clientAny.readyState();
            return typeof state === "string" ? state : String(state);
        }
        return "unknown";
    }
    wireEvents(client) {
        if (this.eventsAttached)
            return;
        client.removeAllListeners();
        client.on("connected", (address, port) => {
            logger.info("Connected", { user: this.account.username, address, port });
            this.account.status = types_1.AccountStatus.Online;
            this.events.onConnected?.(this.emitStatus());
        });
        client.on("logon", () => {
            logger.info("Logon", { user: this.account.username });
        });
        client.on("join", (channel, username, self) => {
            logger.info("Joined channel", { channel, username, self });
        });
        client.on("message", (_channel, tags, messageText, self) => {
            const author = tags["display-name"] ?? tags.username ?? "unknown";
            logger.debug("Chat message", { channel: _channel, author, self, text: messageText });
            if (self)
                return;
            const message = {
                author,
                text: messageText,
                timestamp: Date.now(),
                mentions: [],
                isStreamer: false,
                isBot: false
            };
            this.events.onMessage?.(this.emitStatus(), message);
        });
        client.on("chat", (channel, tags, messageText, self) => {
            const author = tags["display-name"] ?? tags.username ?? "unknown";
            logger.debug("Chat event", { channel, author, self, text: messageText });
        });
        client.on("notice", (channel, msgid, messageText) => {
            logger.warn("Notice", { user: this.account.username, channel, msgid, message: messageText });
        });
        client.on("messagedeleted", (channel, username, deletedMessage) => {
            logger.warn("Message deleted", { channel, username, deletedMessage });
            this.events.onMessageDeleted?.(this.emitStatus(), "deleted");
        });
        client.on("timeout", (channel, username, reason, duration) => {
            logger.warn("Timeout", { channel, username, reason, duration });
            this.account.status = types_1.AccountStatus.Error;
            this.events.onTimeout?.(this.emitStatus(), "timeout");
        });
        client.on("ban", (channel, username, reason) => {
            logger.warn("Ban", { channel, username, reason });
            this.account.status = types_1.AccountStatus.Banned;
            this.events.onBan?.(this.emitStatus(), "ban");
        });
        client.on("disconnected", (reason) => {
            this.stopMessageLoop();
            logger.warn("Disconnected", { user: this.account.username, reason });
            if (this.isStopping) {
                this.account.status = types_1.AccountStatus.Idle;
                this.events.onDisconnected?.(this.emitStatus(), "manual");
                return;
            }
            this.account.status = types_1.AccountStatus.Error;
            this.account.lastError = reason;
            this.events.onDisconnected?.(this.emitStatus(), reason);
        });
        client.on("reconnect", () => {
            logger.info("Reconnect", { user: this.account.username });
        });
        this.eventsAttached = true;
    }
    async applyTypingDelay() {
        const min = Math.min(this.typingDelayMin, this.typingDelayMax);
        const max = Math.max(this.typingDelayMin, this.typingDelayMax);
        const delay = Math.floor(min + Math.random() * (max - min + 1));
        await sleep(delay);
    }
    emitStatus() {
        this.account.isViewing = this.isViewing;
        return this.getState();
    }
    async startViewerMode() {
        try {
            const config = (0, config_1.loadConfig)();
            const viewerOptions = BrowserProfile_1.BrowserProfile.getRandomOptions(config);
            const success = await this.viewerService.startViewing(this.account.username, this.account.oauth, this.channel, viewerOptions);
            if (success) {
                this.isViewing = true;
                this.account.isViewing = true;
                this.events.onConnected?.(this.emitStatus());
            }
        }
        catch (error) {
            console.error(`Failed to start viewer mode for ${this.account.username}:`, error);
        }
    }
}
exports.IndividualBot = IndividualBot;
