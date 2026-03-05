import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import defaults from "./defaults.json";
import { AppConfig, BotMode, isBotMode, isNonEmptyString } from "../utils/types";

dotenv.config();

const CONFIG_PATH = path.resolve(process.cwd(), "config.json");

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const normalizeMode = (value: unknown, fallback: BotMode): BotMode =>
  isBotMode(value) ? value : fallback;

const normalizeChannel = (value: string): string => value.trim().replace(/^#/, "").toLowerCase();

const ensureRange = (value: number, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isNonEmptyString).map((item) => item.trim()).filter((item) => item.length > 0);
};

const isIpv4 = (value: string): boolean =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(value) &&
  value.split(".").every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });

const isPrivateIpv4 = (value: string): boolean => {
  if (!isIpv4(value)) return false;
  const [a, b] = value.split(".").map((part) => Number(part));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
};

const isValidProxy = (value: string): boolean => {
  try {
    const raw = value.trim();
    if (raw.length === 0) return false;
    const normalized = raw.includes("://") ? raw : `http://${raw}`;
    const parsed = new URL(normalized);
    if (!["http:", "https:", "socks4:", "socks5:"].includes(parsed.protocol)) return false;
    if (!parsed.hostname || !parsed.port) return false;
    if (parsed.hostname.toLowerCase() === "localhost") return false;
    if (isPrivateIpv4(parsed.hostname)) return false;
    const port = Number(parsed.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
    return true;
  } catch {
    return false;
  }
};

const normalizeProxies = (value: unknown): string[] =>
  normalizeStringArray(value).filter(isValidProxy);

const loadJsonConfig = (): Partial<AppConfig> => {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  try {
    return JSON.parse(raw) as Partial<AppConfig>;
  } catch {
    return {};
  }
};

export const loadConfig = (): AppConfig => {
  const fileConfig = loadJsonConfig();

  const mode = normalizeMode(fileConfig.mode ?? process.env.BOT_MODE, defaults.mode as BotMode);

  const channelRaw = isNonEmptyString(fileConfig.channel)
    ? fileConfig.channel
    : isNonEmptyString(process.env.TWITCH_CHANNEL)
      ? process.env.TWITCH_CHANNEL
      : "";

  const channel = channelRaw ? normalizeChannel(channelRaw) : "";

  const streamerNameRaw = isNonEmptyString(fileConfig.streamerName)
    ? fileConfig.streamerName
    : isNonEmptyString(process.env.STREAMER_NAME)
      ? process.env.STREAMER_NAME
      : "";

  const streamerName = streamerNameRaw ? streamerNameRaw.trim().toLowerCase() : "";

  const openAiApiKey = isNonEmptyString(process.env.OPENAI_API_KEY)
    ? process.env.OPENAI_API_KEY
    : isNonEmptyString(fileConfig.openAiApiKey)
      ? fileConfig.openAiApiKey
      : undefined;

  const messageCooldownSeconds = ensureRange(
    toNumber(fileConfig.messageCooldownSeconds, defaults.messageCooldownSeconds),
    30,
    120,
    defaults.messageCooldownSeconds
  );

  let messageCooldownMinSeconds = ensureRange(
    toNumber(fileConfig.messageCooldownMinSeconds ?? messageCooldownSeconds, defaults.messageCooldownMinSeconds),
    30,
    120,
    defaults.messageCooldownMinSeconds
  );

  let messageCooldownMaxSeconds = ensureRange(
    toNumber(fileConfig.messageCooldownMaxSeconds ?? messageCooldownSeconds, defaults.messageCooldownMaxSeconds),
    30,
    120,
    defaults.messageCooldownMaxSeconds
  );

  if (messageCooldownMinSeconds > messageCooldownMaxSeconds) {
    const temp = messageCooldownMinSeconds;
    messageCooldownMinSeconds = messageCooldownMaxSeconds;
    messageCooldownMaxSeconds = temp;
  }

  let globalMessagesPerMinuteMin = ensureRange(
    toNumber(
      fileConfig.globalMessagesPerMinuteMin ??
        fileConfig.globalMessagesPerMinute ??
        defaults.globalMessagesPerMinuteMin,
      defaults.globalMessagesPerMinuteMin
    ),
    1,
    10,
    defaults.globalMessagesPerMinuteMin
  );

  let globalMessagesPerMinuteMax = ensureRange(
    toNumber(
      fileConfig.globalMessagesPerMinuteMax ??
        fileConfig.globalMessagesPerMinute ??
        defaults.globalMessagesPerMinuteMax,
      defaults.globalMessagesPerMinuteMax
    ),
    1,
    10,
    defaults.globalMessagesPerMinuteMax
  );

  if (globalMessagesPerMinuteMin > globalMessagesPerMinuteMax) {
    const temp = globalMessagesPerMinuteMin;
    globalMessagesPerMinuteMin = globalMessagesPerMinuteMax;
    globalMessagesPerMinuteMax = temp;
  }

  let aiResponseDelayMin = ensureRange(
    toNumber(fileConfig.aiResponseDelayMin, defaults.aiResponseDelayMin),
    1000,
    20000,
    defaults.aiResponseDelayMin
  );
  let aiResponseDelayMax = ensureRange(
    toNumber(fileConfig.aiResponseDelayMax, defaults.aiResponseDelayMax),
    1000,
    20000,
    defaults.aiResponseDelayMax
  );
  if (aiResponseDelayMin > aiResponseDelayMax) {
    const tmp = aiResponseDelayMin;
    aiResponseDelayMin = aiResponseDelayMax;
    aiResponseDelayMax = tmp;
  }

  const config: AppConfig = {
    channel,
    streamerName,
    mode,
    openAiApiKey,
    openAiModel: isNonEmptyString(fileConfig.openAiModel) ? fileConfig.openAiModel : defaults.openAiModel,
    openAiMaxTokens: ensureRange(
      toNumber(fileConfig.openAiMaxTokens, defaults.openAiMaxTokens),
      10,
      200,
      defaults.openAiMaxTokens
    ),
    openAiTemperature: clamp(
      toNumber(fileConfig.openAiTemperature, defaults.openAiTemperature),
      0,
      2
    ),
    openAiTopP: clamp(
      toNumber(fileConfig.openAiTopP, defaults.openAiTopP),
      0,
      1
    ),
    databasePath: isNonEmptyString(fileConfig.databasePath) ? fileConfig.databasePath : defaults.databasePath,
    logDir: isNonEmptyString(fileConfig.logDir) ? fileConfig.logDir : defaults.logDir,
    rollingBufferSize: ensureRange(
      toNumber(fileConfig.rollingBufferSize, defaults.rollingBufferSize),
      50,
      1000,
      defaults.rollingBufferSize
    ),
    chatPreviewLimit: ensureRange(
      toNumber(fileConfig.chatPreviewLimit, defaults.chatPreviewLimit),
      10,
      200,
      defaults.chatPreviewLimit
    ),
    messageCooldownSeconds,
    messageCooldownMinSeconds,
    messageCooldownMaxSeconds,
    globalMessagesPerMinute: ensureRange(
      toNumber(fileConfig.globalMessagesPerMinute, globalMessagesPerMinuteMin),
      1,
      10,
      globalMessagesPerMinuteMin
    ),
    globalMessagesPerMinuteMin,
    globalMessagesPerMinuteMax,
    aiEnabled: typeof fileConfig.aiEnabled === "boolean" ? fileConfig.aiEnabled : defaults.aiEnabled,
    aiApiKey: isNonEmptyString(fileConfig.aiApiKey) ? fileConfig.aiApiKey : defaults.aiApiKey,
    aiModel: isNonEmptyString(fileConfig.aiModel) ? fileConfig.aiModel : defaults.aiModel,
    aiResponseChance: clamp(
      toNumber(fileConfig.aiResponseChance, defaults.aiResponseChance),
      0,
      1
    ),
    aiResponseDelayMin,
    aiResponseDelayMax,
    floatingEnabled: typeof fileConfig.floatingEnabled === "boolean"
      ? fileConfig.floatingEnabled
      : defaults.floatingEnabled,
    viewbotEnabled: typeof fileConfig.viewbotEnabled === "boolean"
      ? fileConfig.viewbotEnabled
      : defaults.viewbotEnabled,
    floatingIntervalMinutes: ensureRange(
      toNumber(fileConfig.floatingIntervalMinutes, defaults.floatingIntervalMinutes),
      1,
      60,
      defaults.floatingIntervalMinutes
    ),
    floatingPercent: ensureRange(
      toNumber(fileConfig.floatingPercent, defaults.floatingPercent),
      0,
      100,
      defaults.floatingPercent
    ),
    floatingOnlinePercent: ensureRange(
      toNumber(fileConfig.floatingOnlinePercent, defaults.floatingOnlinePercent),
      0,
      30,
      defaults.floatingOnlinePercent
    ),
    joinStaggerMinSec: ensureRange(
      toNumber(fileConfig.joinStaggerMinSec, defaults.joinStaggerMinSec),
      1,
      10,
      defaults.joinStaggerMinSec
    ),
    joinStaggerMaxSec: ensureRange(
      toNumber(fileConfig.joinStaggerMaxSec, defaults.joinStaggerMaxSec),
      1,
      10,
      defaults.joinStaggerMaxSec
    ),
    maxParallelJoins: ensureRange(
      toNumber(fileConfig.maxParallelJoins, defaults.maxParallelJoins),
      1,
      20,
      defaults.maxParallelJoins
    ),
    reconnect: {
      maxAttempts: defaults.reconnect.maxAttempts,
      delaysSec: Array.isArray(fileConfig.reconnect?.delaysSec)
        ? fileConfig.reconnect!.delaysSec.map((v) => toNumber(v, 1))
        : defaults.reconnect.delaysSec
    },
    cleanupDays: ensureRange(toNumber(fileConfig.cleanupDays, defaults.cleanupDays), 1, 30, defaults.cleanupDays),
    typingDelayMinMs: ensureRange(
      toNumber(fileConfig.typingDelayMinMs, defaults.typingDelayMinMs),
      200,
      5000,
      defaults.typingDelayMinMs
    ),
    typingDelayMaxMs: ensureRange(
      toNumber(fileConfig.typingDelayMaxMs, defaults.typingDelayMaxMs),
      200,
      8000,
      defaults.typingDelayMaxMs
    ),
    accountsTestBatchSize: ensureRange(
      toNumber(fileConfig.accountsTestBatchSize, defaults.accountsTestBatchSize),
      1,
      20,
      defaults.accountsTestBatchSize
    ),
    accountsTestDelayMinMs: ensureRange(
      toNumber(fileConfig.accountsTestDelayMinMs, defaults.accountsTestDelayMinMs),
      200,
      5000,
      defaults.accountsTestDelayMinMs
    ),
    accountsTestDelayMaxMs: ensureRange(
      toNumber(fileConfig.accountsTestDelayMaxMs, defaults.accountsTestDelayMaxMs),
      200,
      8000,
      defaults.accountsTestDelayMaxMs
    ),
    emotionCooldownSec: ensureRange(
      toNumber(fileConfig.emotionCooldownSec, defaults.emotionCooldownSec),
      5,
      60,
      defaults.emotionCooldownSec
    ),
    emotionSelectPercentMin: ensureRange(
      toNumber(fileConfig.emotionSelectPercentMin, defaults.emotionSelectPercentMin),
      10,
      90,
      defaults.emotionSelectPercentMin
    ),
    emotionSelectPercentMax: ensureRange(
      toNumber(fileConfig.emotionSelectPercentMax, defaults.emotionSelectPercentMax),
      10,
      90,
      defaults.emotionSelectPercentMax
    ),
    emotionStaggerMinMs: ensureRange(
      toNumber(fileConfig.emotionStaggerMinMs, defaults.emotionStaggerMinMs),
      100,
      5000,
      defaults.emotionStaggerMinMs
    ),
    emotionStaggerMaxMs: ensureRange(
      toNumber(fileConfig.emotionStaggerMaxMs, defaults.emotionStaggerMaxMs),
      100,
      5000,
      defaults.emotionStaggerMaxMs
    ),
    welcomeDelayMinSec: ensureRange(
      toNumber(fileConfig.welcomeDelayMinSec, defaults.welcomeDelayMinSec),
      1,
      60,
      defaults.welcomeDelayMinSec
    ),
    welcomeDelayMaxSec: ensureRange(
      toNumber(fileConfig.welcomeDelayMaxSec, defaults.welcomeDelayMaxSec),
      1,
      60,
      defaults.welcomeDelayMaxSec
    ),
    proxies: normalizeProxies(fileConfig.proxies).length > 0
      ? normalizeProxies(fileConfig.proxies)
      : normalizeProxies(defaults.proxies),
    userAgents: normalizeStringArray(fileConfig.userAgents).length > 0
      ? normalizeStringArray(fileConfig.userAgents)
      : normalizeStringArray(defaults.userAgents)
  };

  return config;
};
