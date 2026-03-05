"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const types_1 = require("../utils/types");
const IndividualBot_1 = require("./IndividualBot");
const BotPool_1 = require("./BotPool");
const Logger_1 = require("../utils/Logger");
const config_1 = require("../config/config");
const ContextTracker_1 = require("../chat/ContextTracker");
const MessageGenerator_1 = require("../chat/MessageGenerator");
const ConversationEngine_1 = require("../chat/ConversationEngine");
const AIService_1 = require("../services/AIService");
const ViewerService_1 = require("../services/ViewerService");
const logger = (0, Logger_1.getLogger)("bots");
class BotManager {
    accountManager;
    pool;
    chatLogger;
    events;
    bots = new Map();
    contextTracker;
    messageGenerator;
    conversationEngine;
    messagesLastMinute = [];
    primaryListenerId = null;
    globalLimit = 0;
    globalLimitUpdatedAt = 0;
    floatingInterval = null;
    floatingTimeout = null;
    floatingInProgress = false;
    floatingStopRequested = false;
    viewerService;
    viewerStatsInterval = null;
    chatHistory = [];
    aiService = null;
    laughVariants = [
        "ахахахахахахах",
        "ахахахаха",
        "лол ебать ржу",
        "броооо ахахахах",
        "ааххпфхп пиздец",
        "ржу не могу",
        "фцхвыцфхпфхцхвфц",
        "лооооол",
        "орууу",
        "ахаха жесть",
        "Ахфывхцфхфца",
        "умираю ахахвфцах",
        "лол кек",
        "ахаха",
        "ахах",
        "пхаха",
        "хахаха",
        "кек",
        "кекек",
        "ору",
        "ржу",
        "пиздец смешно",
        "ахахаха блин",
        "ахахахах",
        "лол",
        "ахпхапх",
        "хех",
        "ыыы",
        "умер",
        "смешно",
        "ахахахахах",
        "ха-ха-ха",
        "хаха"
    ];
    greetingVariants = [
        "Всем привет",
        "Здарова",
        "Хай чат",
        "Салам",
        "Йоу",
        "Здаров",
        "Привет всем",
        "Хелоу",
        "Здравствуйте",
        "Дароу",
        "Приветули",
        "Ку",
        "Хай хай",
        "Здорова братва",
        "Всем здарова",
        "Здравствуй чат",
        "Приветик",
        "Хеллоу",
        "Хай бро",
        "Дратути",
        "Всем хай",
        "Здарова чат",
        "Салют",
        "О привет",
        "Йоу чат"
    ];
    constructor(accountManager, chatLogger, events) {
        this.accountManager = accountManager;
        this.pool = new BotPool_1.BotPool();
        this.chatLogger = chatLogger;
        this.events = events;
        this.viewerService = new ViewerService_1.ViewerService();
        this.contextTracker = new ContextTracker_1.ContextTracker();
        this.messageGenerator = new MessageGenerator_1.MessageGenerator();
        this.conversationEngine = new ConversationEngine_1.ConversationEngine(this.contextTracker, this.messageGenerator, this);
        this.viewerStatsInterval = setInterval(() => {
            if (!(0, config_1.loadConfig)().viewbotEnabled)
                return;
            const stats = this.viewerService.getStats();
            console.log(`📊 Viewbot stats: ${stats.activeBrowsers} browsers, ~${stats.estimatedRAM} MB RAM, ~${stats.estimatedBandwidth} Mbps`);
        }, 60000);
    }
    initialize() {
        this.bots.clear();
        this.chatHistory = [];
        const config = (0, config_1.loadConfig)();
        const streamerLower = config.streamerName.toLowerCase();
        logger.info("BotManager init", { channel: config.channel });
        this.primaryListenerId = null;
        this.aiService = new AIService_1.AIService(config, this.accountManager.getAll().map((a) => a.username));
        this.accountManager.getAll().forEach((account) => {
            if (!this.primaryListenerId) {
                this.primaryListenerId = account.username;
            }
            const scheduler = {
                canSendGlobally: () => this.canSendGlobally(),
                recordGlobalMessage: () => this.recordMessage(),
                generateMessage: (bot) => this.conversationEngine.generateMessage(bot),
                onMessageSent: (bot, text) => {
                    logger.info("Bot message sent", { bot: bot.getId(), text });
                },
                onMessageSkipped: (bot, reason) => {
                    logger.debug("Bot message skipped", { bot: bot.getId(), reason });
                }
            };
            const bot = new IndividualBot_1.IndividualBot(account, this.viewerService, {
                onMessage: (_state, message) => {
                    if (!this.shouldProcessMessage(account.username)) {
                        return;
                    }
                    this.appendChatHistory(message);
                    void this.handleChatMessage(message);
                    const mentions = (0, ContextTracker_1.parseMentions)(message.text);
                    const authorLower = message.author.toLowerCase();
                    message.mentions = mentions;
                    message.isStreamer = streamerLower !== "" && authorLower === streamerLower;
                    message.isBot = this.accountManager
                        .getAll()
                        .some((acc) => acc.username.toLowerCase() === authorLower);
                    this.chatLogger?.addMessage(message);
                    this.events?.onChatMessage?.(message);
                    this.bots.forEach((botRef) => {
                        const mentioned = mentions.includes(botRef.getId().toLowerCase());
                        this.contextTracker.addMessage(botRef.getId(), message, mentioned);
                    });
                    logger.debug("Message received", { bot: account.username });
                },
                onConnected: () => {
                    this.accountManager.updateStatus(account.username, types_1.AccountStatus.Online);
                    this.events?.onAccountStatusChanged?.(account);
                },
                onDisconnected: (_state, reason) => {
                    if (reason === "manual") {
                        this.accountManager.updateStatus(account.username, types_1.AccountStatus.Idle);
                    }
                    else {
                        this.accountManager.updateStatus(account.username, types_1.AccountStatus.Error, reason);
                    }
                    if (this.primaryListenerId === account.username) {
                        this.primaryListenerId = null;
                    }
                    this.events?.onAccountStatusChanged?.(account);
                },
                onBan: () => {
                    this.accountManager.updateStatus(account.username, types_1.AccountStatus.Banned, "ban");
                    this.events?.onAccountStatusChanged?.(account);
                },
                onTimeout: () => {
                    this.accountManager.updateStatus(account.username, types_1.AccountStatus.Error, "timeout");
                    this.events?.onAccountStatusChanged?.(account);
                }
            }, scheduler, account.username === this.primaryListenerId);
            this.bots.set(account.username, bot);
        });
    }
    async startAll() {
        const list = Array.from(this.bots.values());
        await this.pool.connectAll(list);
        this.startFloating();
    }
    async stopAll() {
        this.stopFloating();
        const list = Array.from(this.bots.values());
        await Promise.all(list.map((bot) => bot.disconnect()));
        await this.viewerService.stopAll();
        this.accountManager.getAll().forEach((account) => {
            this.accountManager.updateStatus(account.username, types_1.AccountStatus.Idle);
            this.events?.onAccountStatusChanged?.(account);
        });
    }
    getBot(username) {
        return this.bots.get(username);
    }
    getOnlineBots() {
        return Array.from(this.bots.values()).filter((bot) => bot.getState().account.status === types_1.AccountStatus.Online);
    }
    getOnlineCount() {
        let count = 0;
        this.accountManager.getAll().forEach((account) => {
            if (account.status === types_1.AccountStatus.Online)
                count += 1;
        });
        return count;
    }
    canSendGlobally() {
        const now = Date.now();
        this.messagesLastMinute = this.messagesLastMinute.filter((ts) => now - ts <= 60_000);
        const limit = this.getGlobalLimit();
        return this.messagesLastMinute.length < limit;
    }
    recordMessage() {
        this.messagesLastMinute.push(Date.now());
    }
    broadcastCustomMessage(text) {
        const trimmed = text.trim();
        if (!trimmed)
            return;
        const onlineBots = this.getOnlineBots();
        if (onlineBots.length === 0)
            return;
        logger.info(`Broadcasting custom message to ${onlineBots.length} bots with 1-4 sec delays`);
        onlineBots.forEach((bot) => {
            const delay = Math.floor(1000 + Math.random() * 3000);
            setTimeout(() => {
                void bot.sendImmediate(trimmed, true);
            }, delay);
        });
    }
    triggerGreeting() {
        const onlineBots = this.getOnlineBots();
        if (onlineBots.length === 0)
            return;
        const ratio = 0.15 + Math.random() * 0.05;
        const count = Math.max(1, Math.floor(onlineBots.length * ratio));
        const selected = this.shuffle(onlineBots).slice(0, count);
        logger.info(`Greeting triggered for ${selected.length}/${onlineBots.length} bots with 5-15 sec delays`);
        selected.forEach((bot) => {
            const delay = Math.floor(5000 + Math.random() * 10000);
            const phrase = this.greetingVariants[Math.floor(Math.random() * this.greetingVariants.length)];
            setTimeout(() => {
                void bot.sendImmediate(phrase, true);
            }, delay);
        });
    }
    async triggerEmotion() {
        const onlineBots = this.getOnlineBots();
        if (onlineBots.length === 0)
            return;
        const ratio = 0.3 + Math.random() * 0.2;
        const targetCount = Math.max(1, Math.floor(onlineBots.length * ratio));
        const shuffled = this.shuffle(onlineBots).slice(0, targetCount);
        logger.info(`Emotion triggered for ${shuffled.length}/${onlineBots.length} bots`);
        shuffled.forEach((bot) => {
            const delay = Math.floor(500 + Math.random() * 1500);
            setTimeout(() => {
                const phrase = this.laughVariants[Math.floor(Math.random() * this.laughVariants.length)];
                void bot.sendImmediate(phrase, true);
            }, delay);
        });
    }
    getConfig() {
        return (0, config_1.loadConfig)();
    }
    async updateConfig(newConfig) {
        const current = (0, config_1.loadConfig)();
        const updated = { ...current, ...newConfig };
        const configPath = path_1.default.resolve(process.cwd(), "config.json");
        fs_1.default.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf8");
        const after = (0, config_1.loadConfig)();
        logger.info("Config updated", { keys: Object.keys(newConfig) });
        if (this.aiService) {
            this.aiService.updateConfig(after);
            if (after.aiEnabled) {
                logger.info("AI mode enabled");
            }
            else {
                logger.info("AI mode disabled");
            }
        }
        this.stopFloating();
        this.startFloating();
        if (current.channel !== after.channel) {
            await this.stopAll();
            this.initialize();
            await this.startAll();
        }
        return after;
    }
    shuffle(list) {
        const array = [...list];
        for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    shouldProcessMessage(botId) {
        if (!this.primaryListenerId) {
            this.primaryListenerId = botId;
            return true;
        }
        return this.primaryListenerId === botId;
    }
    appendChatHistory(message) {
        this.chatHistory.push(message);
        if (this.chatHistory.length > 20) {
            this.chatHistory.splice(0, this.chatHistory.length - 20);
        }
    }
    async handleChatMessage(message) {
        const config = (0, config_1.loadConfig)();
        if (!config.aiEnabled || !this.aiService)
            return;
        if (!this.aiService.isBotMessage(message.author))
            return;
        if (Math.random() >= config.aiResponseChance)
            return;
        const onlineBots = this.getOnlineBots().filter((bot) => bot.getUsername().toLowerCase() !== message.author.toLowerCase());
        if (onlineBots.length === 0)
            return;
        const responder = onlineBots[Math.floor(Math.random() * onlineBots.length)];
        const response = await this.aiService.generateResponse(this.chatHistory.slice(-5), responder.getUsername());
        if (!response)
            return;
        const min = Math.min(config.aiResponseDelayMin, config.aiResponseDelayMax);
        const max = Math.max(config.aiResponseDelayMin, config.aiResponseDelayMax);
        const delay = Math.floor(min + Math.random() * (max - min));
        setTimeout(() => {
            void responder.sendImmediate(response, true);
        }, delay);
        logger.info("AI response", {
            from: responder.getUsername(),
            to: message.author,
            response
        });
    }
    startFloating() {
        const config = (0, config_1.loadConfig)();
        this.floatingStopRequested = false;
        if (!config.floatingEnabled)
            return;
        if (this.floatingInterval)
            return;
        const intervalMs = Math.max(1, config.floatingIntervalMinutes) * 60 * 1000;
        this.floatingInterval = setInterval(() => {
            void this.floatBots();
        }, intervalMs);
    }
    stopFloating() {
        this.floatingStopRequested = true;
        if (this.floatingInterval) {
            clearInterval(this.floatingInterval);
            this.floatingInterval = null;
        }
        if (this.floatingTimeout) {
            clearTimeout(this.floatingTimeout);
            this.floatingTimeout = null;
        }
    }
    async floatBots() {
        if (this.floatingInProgress)
            return;
        const config = (0, config_1.loadConfig)();
        if (!config.floatingEnabled)
            return;
        const onlineBots = this.getOnlineBots();
        if (onlineBots.length === 0)
            return;
        const count = Math.floor(onlineBots.length * (config.floatingPercent / 100));
        if (count <= 0)
            return;
        this.floatingInProgress = true;
        const selected = this.shuffle(onlineBots).slice(0, count);
        logger.info(`Floating: disconnecting ${selected.length}/${onlineBots.length} bots`);
        await Promise.all(selected.map((bot) => bot.disconnect()));
        const delayMs = Math.floor(30_000 + Math.random() * 30_000);
        this.floatingTimeout = setTimeout(() => {
            void this.reconnectFloatingBots(selected);
        }, delayMs);
    }
    async reconnectFloatingBots(bots) {
        try {
            if (this.floatingStopRequested)
                return;
            let reconnected = 0;
            for (const bot of bots) {
                if (this.floatingStopRequested)
                    break;
                const stagger = Math.floor(2000 + Math.random() * 1000);
                await new Promise((resolve) => setTimeout(resolve, stagger));
                await bot.connect();
                reconnected += 1;
            }
            logger.info(`Floating: reconnected ${reconnected} bots`);
        }
        finally {
            this.floatingInProgress = false;
            this.floatingTimeout = null;
        }
    }
    getGlobalLimit() {
        const config = (0, config_1.loadConfig)();
        const now = Date.now();
        if (this.globalLimit === 0 || now - this.globalLimitUpdatedAt > 60_000) {
            const min = Math.min(config.globalMessagesPerMinuteMin, config.globalMessagesPerMinuteMax);
            const max = Math.max(config.globalMessagesPerMinuteMin, config.globalMessagesPerMinuteMax);
            this.globalLimit = Math.floor(min + Math.random() * (max - min + 1));
            this.globalLimitUpdatedAt = now;
        }
        return this.globalLimit;
    }
}
exports.BotManager = BotManager;
