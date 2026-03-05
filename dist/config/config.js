"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const defaults_json_1 = __importDefault(require("./defaults.json"));
const types_1 = require("../utils/types");
dotenv_1.default.config();
const CONFIG_PATH = path_1.default.resolve(process.cwd(), "config.json");
const toNumber = (value, fallback) => {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizeMode = (value, fallback) => (0, types_1.isBotMode)(value) ? value : fallback;
const normalizeChannel = (value) => value.trim().replace(/^#/, "").toLowerCase();
const ensureRange = (value, min, max, fallback) => {
    if (!Number.isFinite(value))
        return fallback;
    if (value < min || value > max)
        return fallback;
    return value;
};
const normalizeStringArray = (value) => {
    if (!Array.isArray(value))
        return [];
    return value.filter(types_1.isNonEmptyString).map((item) => item.trim()).filter((item) => item.length > 0);
};
const isValidProxy = (value) => {
    try {
        const raw = value.trim();
        if (raw.length === 0)
            return false;
        const normalized = raw.includes("://") ? raw : `http://${raw}`;
        const parsed = new URL(normalized);
        if (!["http:", "https:"].includes(parsed.protocol))
            return false;
        if (!parsed.hostname || !parsed.port)
            return false;
        const port = Number(parsed.port);
        if (!Number.isInteger(port) || port < 1 || port > 65535)
            return false;
        return true;
    }
    catch {
        return false;
    }
};
const normalizeProxies = (value) => normalizeStringArray(value).filter(isValidProxy);
const loadJsonConfig = () => {
    if (!fs_1.default.existsSync(CONFIG_PATH))
        return {};
    const raw = fs_1.default.readFileSync(CONFIG_PATH, "utf-8");
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
};
const loadConfig = () => {
    const fileConfig = loadJsonConfig();
    const mode = normalizeMode(fileConfig.mode ?? process.env.BOT_MODE, defaults_json_1.default.mode);
    const channelRaw = (0, types_1.isNonEmptyString)(fileConfig.channel)
        ? fileConfig.channel
        : (0, types_1.isNonEmptyString)(process.env.TWITCH_CHANNEL)
            ? process.env.TWITCH_CHANNEL
            : "";
    const channel = channelRaw ? normalizeChannel(channelRaw) : "";
    const streamerNameRaw = (0, types_1.isNonEmptyString)(fileConfig.streamerName)
        ? fileConfig.streamerName
        : (0, types_1.isNonEmptyString)(process.env.STREAMER_NAME)
            ? process.env.STREAMER_NAME
            : "";
    const streamerName = streamerNameRaw ? streamerNameRaw.trim().toLowerCase() : "";
    const openAiApiKey = (0, types_1.isNonEmptyString)(process.env.OPENAI_API_KEY)
        ? process.env.OPENAI_API_KEY
        : (0, types_1.isNonEmptyString)(fileConfig.openAiApiKey)
            ? fileConfig.openAiApiKey
            : undefined;
    const messageCooldownSeconds = ensureRange(toNumber(fileConfig.messageCooldownSeconds, defaults_json_1.default.messageCooldownSeconds), 30, 120, defaults_json_1.default.messageCooldownSeconds);
    let messageCooldownMinSeconds = ensureRange(toNumber(fileConfig.messageCooldownMinSeconds ?? messageCooldownSeconds, defaults_json_1.default.messageCooldownMinSeconds), 30, 120, defaults_json_1.default.messageCooldownMinSeconds);
    let messageCooldownMaxSeconds = ensureRange(toNumber(fileConfig.messageCooldownMaxSeconds ?? messageCooldownSeconds, defaults_json_1.default.messageCooldownMaxSeconds), 30, 120, defaults_json_1.default.messageCooldownMaxSeconds);
    if (messageCooldownMinSeconds > messageCooldownMaxSeconds) {
        const temp = messageCooldownMinSeconds;
        messageCooldownMinSeconds = messageCooldownMaxSeconds;
        messageCooldownMaxSeconds = temp;
    }
    let globalMessagesPerMinuteMin = ensureRange(toNumber(fileConfig.globalMessagesPerMinuteMin ??
        fileConfig.globalMessagesPerMinute ??
        defaults_json_1.default.globalMessagesPerMinuteMin, defaults_json_1.default.globalMessagesPerMinuteMin), 1, 10, defaults_json_1.default.globalMessagesPerMinuteMin);
    let globalMessagesPerMinuteMax = ensureRange(toNumber(fileConfig.globalMessagesPerMinuteMax ??
        fileConfig.globalMessagesPerMinute ??
        defaults_json_1.default.globalMessagesPerMinuteMax, defaults_json_1.default.globalMessagesPerMinuteMax), 1, 10, defaults_json_1.default.globalMessagesPerMinuteMax);
    if (globalMessagesPerMinuteMin > globalMessagesPerMinuteMax) {
        const temp = globalMessagesPerMinuteMin;
        globalMessagesPerMinuteMin = globalMessagesPerMinuteMax;
        globalMessagesPerMinuteMax = temp;
    }
    let aiResponseDelayMin = ensureRange(toNumber(fileConfig.aiResponseDelayMin, defaults_json_1.default.aiResponseDelayMin), 1000, 20000, defaults_json_1.default.aiResponseDelayMin);
    let aiResponseDelayMax = ensureRange(toNumber(fileConfig.aiResponseDelayMax, defaults_json_1.default.aiResponseDelayMax), 1000, 20000, defaults_json_1.default.aiResponseDelayMax);
    if (aiResponseDelayMin > aiResponseDelayMax) {
        const tmp = aiResponseDelayMin;
        aiResponseDelayMin = aiResponseDelayMax;
        aiResponseDelayMax = tmp;
    }
    const config = {
        channel,
        streamerName,
        mode,
        openAiApiKey,
        openAiModel: (0, types_1.isNonEmptyString)(fileConfig.openAiModel) ? fileConfig.openAiModel : defaults_json_1.default.openAiModel,
        openAiMaxTokens: ensureRange(toNumber(fileConfig.openAiMaxTokens, defaults_json_1.default.openAiMaxTokens), 10, 200, defaults_json_1.default.openAiMaxTokens),
        openAiTemperature: clamp(toNumber(fileConfig.openAiTemperature, defaults_json_1.default.openAiTemperature), 0, 2),
        openAiTopP: clamp(toNumber(fileConfig.openAiTopP, defaults_json_1.default.openAiTopP), 0, 1),
        databasePath: (0, types_1.isNonEmptyString)(fileConfig.databasePath) ? fileConfig.databasePath : defaults_json_1.default.databasePath,
        logDir: (0, types_1.isNonEmptyString)(fileConfig.logDir) ? fileConfig.logDir : defaults_json_1.default.logDir,
        rollingBufferSize: ensureRange(toNumber(fileConfig.rollingBufferSize, defaults_json_1.default.rollingBufferSize), 50, 1000, defaults_json_1.default.rollingBufferSize),
        chatPreviewLimit: ensureRange(toNumber(fileConfig.chatPreviewLimit, defaults_json_1.default.chatPreviewLimit), 10, 200, defaults_json_1.default.chatPreviewLimit),
        messageCooldownSeconds,
        messageCooldownMinSeconds,
        messageCooldownMaxSeconds,
        globalMessagesPerMinute: ensureRange(toNumber(fileConfig.globalMessagesPerMinute, globalMessagesPerMinuteMin), 1, 10, globalMessagesPerMinuteMin),
        globalMessagesPerMinuteMin,
        globalMessagesPerMinuteMax,
        aiEnabled: typeof fileConfig.aiEnabled === "boolean" ? fileConfig.aiEnabled : defaults_json_1.default.aiEnabled,
        aiApiKey: (0, types_1.isNonEmptyString)(fileConfig.aiApiKey) ? fileConfig.aiApiKey : defaults_json_1.default.aiApiKey,
        aiModel: (0, types_1.isNonEmptyString)(fileConfig.aiModel) ? fileConfig.aiModel : defaults_json_1.default.aiModel,
        aiResponseChance: clamp(toNumber(fileConfig.aiResponseChance, defaults_json_1.default.aiResponseChance), 0, 1),
        aiResponseDelayMin,
        aiResponseDelayMax,
        floatingEnabled: typeof fileConfig.floatingEnabled === "boolean"
            ? fileConfig.floatingEnabled
            : defaults_json_1.default.floatingEnabled,
        viewbotEnabled: typeof fileConfig.viewbotEnabled === "boolean"
            ? fileConfig.viewbotEnabled
            : defaults_json_1.default.viewbotEnabled,
        floatingIntervalMinutes: ensureRange(toNumber(fileConfig.floatingIntervalMinutes, defaults_json_1.default.floatingIntervalMinutes), 1, 60, defaults_json_1.default.floatingIntervalMinutes),
        floatingPercent: ensureRange(toNumber(fileConfig.floatingPercent, defaults_json_1.default.floatingPercent), 0, 100, defaults_json_1.default.floatingPercent),
        floatingOnlinePercent: ensureRange(toNumber(fileConfig.floatingOnlinePercent, defaults_json_1.default.floatingOnlinePercent), 0, 30, defaults_json_1.default.floatingOnlinePercent),
        joinStaggerMinSec: ensureRange(toNumber(fileConfig.joinStaggerMinSec, defaults_json_1.default.joinStaggerMinSec), 1, 10, defaults_json_1.default.joinStaggerMinSec),
        joinStaggerMaxSec: ensureRange(toNumber(fileConfig.joinStaggerMaxSec, defaults_json_1.default.joinStaggerMaxSec), 1, 10, defaults_json_1.default.joinStaggerMaxSec),
        maxParallelJoins: ensureRange(toNumber(fileConfig.maxParallelJoins, defaults_json_1.default.maxParallelJoins), 1, 20, defaults_json_1.default.maxParallelJoins),
        reconnect: {
            maxAttempts: defaults_json_1.default.reconnect.maxAttempts,
            delaysSec: Array.isArray(fileConfig.reconnect?.delaysSec)
                ? fileConfig.reconnect.delaysSec.map((v) => toNumber(v, 1))
                : defaults_json_1.default.reconnect.delaysSec
        },
        cleanupDays: ensureRange(toNumber(fileConfig.cleanupDays, defaults_json_1.default.cleanupDays), 1, 30, defaults_json_1.default.cleanupDays),
        typingDelayMinMs: ensureRange(toNumber(fileConfig.typingDelayMinMs, defaults_json_1.default.typingDelayMinMs), 200, 5000, defaults_json_1.default.typingDelayMinMs),
        typingDelayMaxMs: ensureRange(toNumber(fileConfig.typingDelayMaxMs, defaults_json_1.default.typingDelayMaxMs), 200, 8000, defaults_json_1.default.typingDelayMaxMs),
        accountsTestBatchSize: ensureRange(toNumber(fileConfig.accountsTestBatchSize, defaults_json_1.default.accountsTestBatchSize), 1, 20, defaults_json_1.default.accountsTestBatchSize),
        accountsTestDelayMinMs: ensureRange(toNumber(fileConfig.accountsTestDelayMinMs, defaults_json_1.default.accountsTestDelayMinMs), 200, 5000, defaults_json_1.default.accountsTestDelayMinMs),
        accountsTestDelayMaxMs: ensureRange(toNumber(fileConfig.accountsTestDelayMaxMs, defaults_json_1.default.accountsTestDelayMaxMs), 200, 8000, defaults_json_1.default.accountsTestDelayMaxMs),
        emotionCooldownSec: ensureRange(toNumber(fileConfig.emotionCooldownSec, defaults_json_1.default.emotionCooldownSec), 5, 60, defaults_json_1.default.emotionCooldownSec),
        emotionSelectPercentMin: ensureRange(toNumber(fileConfig.emotionSelectPercentMin, defaults_json_1.default.emotionSelectPercentMin), 10, 90, defaults_json_1.default.emotionSelectPercentMin),
        emotionSelectPercentMax: ensureRange(toNumber(fileConfig.emotionSelectPercentMax, defaults_json_1.default.emotionSelectPercentMax), 10, 90, defaults_json_1.default.emotionSelectPercentMax),
        emotionStaggerMinMs: ensureRange(toNumber(fileConfig.emotionStaggerMinMs, defaults_json_1.default.emotionStaggerMinMs), 100, 5000, defaults_json_1.default.emotionStaggerMinMs),
        emotionStaggerMaxMs: ensureRange(toNumber(fileConfig.emotionStaggerMaxMs, defaults_json_1.default.emotionStaggerMaxMs), 100, 5000, defaults_json_1.default.emotionStaggerMaxMs),
        welcomeDelayMinSec: ensureRange(toNumber(fileConfig.welcomeDelayMinSec, defaults_json_1.default.welcomeDelayMinSec), 1, 60, defaults_json_1.default.welcomeDelayMinSec),
        welcomeDelayMaxSec: ensureRange(toNumber(fileConfig.welcomeDelayMaxSec, defaults_json_1.default.welcomeDelayMaxSec), 1, 60, defaults_json_1.default.welcomeDelayMaxSec),
        proxies: normalizeProxies(fileConfig.proxies).length > 0
            ? normalizeProxies(fileConfig.proxies)
            : normalizeProxies(defaults_json_1.default.proxies),
        userAgents: normalizeStringArray(fileConfig.userAgents).length > 0
            ? normalizeStringArray(fileConfig.userAgents)
            : normalizeStringArray(defaults_json_1.default.userAgents)
    };
    return config;
};
exports.loadConfig = loadConfig;
