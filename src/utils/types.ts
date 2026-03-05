import type { Client } from "tmi.js";

export enum AccountStatus {
  Idle = "idle",
  Connecting = "connecting",
  Online = "online",
  Error = "error",
  Banned = "banned"
}

export enum BotMode {
  Fixed = "fixed",
  AI = "ai"
}

export interface Account {
  username: string;
  password: string;
  oauth: string;
  status: AccountStatus;
  isViewing?: boolean;
  lastError?: string;
  lastActive: number;
  messagesSent: number;
  connectedAt?: number;
}

export interface Message {
  author: string;
  text: string;
  timestamp: number;
  mentions: string[];
  isStreamer: boolean;
  isBot: boolean;
}

export interface RateLimiter {
  removeTokens(count: number): Promise<void>;
  getTokens(): number;
  canConsume(count: number): boolean;
  consume(count: number): boolean;
}

export interface BotState {
  id: string;
  account: Account;
  client: Client | null;
  lastMessageTime: number;
  cooldownSeconds: number;
  awaitingReply: boolean;
  conversationContext: Message[];
  rateLimiter: RateLimiter;
}

export interface BotStatus {
  username: string;
  status: AccountStatus;
  lastError?: string;
  isViewing?: boolean;
}

export interface TokenBucketConfig {
  capacity: number;
  refillTokens: number;
  refillIntervalMs: number;
}

export interface ReconnectConfig {
  maxAttempts: number;
  delaysSec: number[];
}

export interface AppConfig {
  channel: string;
  streamerName: string;
  mode: BotMode;
  openAiApiKey?: string;
  openAiModel: string;
  openAiMaxTokens: number;
  openAiTemperature: number;
  openAiTopP: number;
  databasePath: string;
  logDir: string;
  rollingBufferSize: number;
  chatPreviewLimit: number;
  messageCooldownSeconds: number;
  messageCooldownMinSeconds: number;
  messageCooldownMaxSeconds: number;
  globalMessagesPerMinute: number;
  globalMessagesPerMinuteMin: number;
  globalMessagesPerMinuteMax: number;
  aiEnabled: boolean;
  aiApiKey: string;
  aiModel: string;
  aiResponseChance: number;
  aiResponseDelayMin: number;
  aiResponseDelayMax: number;
  floatingEnabled: boolean;
  viewbotEnabled: boolean;
  floatingIntervalMinutes: number;
  floatingPercent: number;
  floatingOnlinePercent: number;
  joinStaggerMinSec: number;
  joinStaggerMaxSec: number;
  maxParallelJoins: number;
  reconnect: ReconnectConfig;
  cleanupDays: number;
  typingDelayMinMs: number;
  typingDelayMaxMs: number;
  accountsTestBatchSize: number;
  accountsTestDelayMinMs: number;
  accountsTestDelayMaxMs: number;
  emotionCooldownSec: number;
  emotionSelectPercentMin: number;
  emotionSelectPercentMax: number;
  emotionStaggerMinMs: number;
  emotionStaggerMaxMs: number;
  welcomeDelayMinSec: number;
  welcomeDelayMaxSec: number;
  proxies: string[];
  userAgents: string[];
}

export interface AccountParseError {
  line: number;
  raw: string;
  reason: string;
}

export interface AccountParseResult {
  accounts: Account[];
  errors: AccountParseError[];
}

export interface LoggerLike {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isAccountStatus = (value: unknown): value is AccountStatus =>
  value === AccountStatus.Idle ||
  value === AccountStatus.Connecting ||
  value === AccountStatus.Online ||
  value === AccountStatus.Error ||
  value === AccountStatus.Banned;

export const isBotMode = (value: unknown): value is BotMode =>
  value === BotMode.Fixed || value === BotMode.AI;

export const nowTs = (): number => Date.now();
