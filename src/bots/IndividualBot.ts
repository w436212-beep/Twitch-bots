import tmi, { Client, ChatUserstate } from "tmi.js";
import { Account, AccountStatus, BotState, Message } from "../utils/types";
import { RateLimiter } from "../utils/RateLimiter";
import { getLogger } from "../utils/Logger";
import { loadConfig } from "../config/config";
import { ViewerService } from "../services/ViewerService";
import { BrowserProfile } from "../utils/BrowserProfile";

export interface BotEvents {
  onConnected?: (bot: BotState) => void;
  onDisconnected?: (bot: BotState, reason: string) => void;
  onMessage?: (bot: BotState, message: Message) => void;
  onBan?: (bot: BotState, reason: string) => void;
  onTimeout?: (bot: BotState, reason: string) => void;
  onMessageDeleted?: (bot: BotState, reason: string) => void;
}

export interface BotScheduler {
  canSendGlobally: () => boolean;
  recordGlobalMessage: () => void;
  generateMessage: (bot: IndividualBot) => Promise<string | null>;
  onMessageSent?: (bot: IndividualBot, text: string) => void;
  onMessageSkipped?: (bot: IndividualBot, reason: string) => void;
}

const logger = getLogger("bots");

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class IndividualBot {
  private client: Client | null = null;
  private readonly account: Account;
  private readonly channel: string;
  private readonly viewerService: ViewerService;
  private readonly rateLimiter: RateLimiter;
  private readonly events: BotEvents;
  private readonly typingDelayMin: number;
  private readonly typingDelayMax: number;
  private readonly debugEnabled: boolean;
  private isViewing = false;
  private isStopping = false;
  private scheduler: BotScheduler | null = null;
  private messageTimer: NodeJS.Timeout | null = null;
  private eventsAttached = false;
  private isConnecting = false;

  constructor(
    account: Account,
    viewerService: ViewerService,
    events: BotEvents = {},
    scheduler?: BotScheduler,
    debugEnabled = false
  ) {
    const config = loadConfig();
    this.account = account;
    this.channel = config.channel;
    this.viewerService = viewerService;
    this.rateLimiter = new RateLimiter({
      capacity: 20,
      refillTokens: 20,
      refillIntervalMs: 30_000
    });
    this.events = events;
    this.typingDelayMin = config.typingDelayMinMs;
    this.typingDelayMax = config.typingDelayMaxMs;
    this.debugEnabled = debugEnabled;
    if (scheduler) this.scheduler = scheduler;
  }

  setScheduler(scheduler: BotScheduler): void {
    this.scheduler = scheduler;
  }

  getId(): string {
    return this.account.username;
  }

  getUsername(): string {
    return this.account.username;
  }

  getState(): BotState {
    return {
      id: this.account.username,
      account: this.account,
      client: this.client,
      lastMessageTime: 0,
      cooldownSeconds: loadConfig().messageCooldownSeconds,
      awaitingReply: false,
      conversationContext: [],
      rateLimiter: this.rateLimiter
    };
  }

  async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.account.status = AccountStatus.Connecting;

    const tokenPreview = this.account.oauth.replace(/^oauth:/, "").slice(0, 10);
    const channel = this.channel;
    logger.info("Creating tmi client", {
      username: this.account.username,
      channel,
      tokenPreview: `oauth:${tokenPreview}...`
    });

    if (!channel) {
      logger.error("Channel is empty, cannot connect", { user: this.account.username });
      this.account.status = AccountStatus.Error;
      this.account.lastError = "Channel not set";
      this.events.onDisconnected?.(this.emitStatus(), "channel_empty");
      this.isConnecting = false;
      return;
    }

    logger.info("Connecting to channel", { user: this.account.username, channel });

    if (this.client) {
      try {
        await this.client.disconnect();
      } catch {
        // ignore
      }
      try {
        this.client.removeAllListeners();
      } catch {
        // ignore
      }
      this.client = null;
      this.eventsAttached = false;
    }

    this.client = new tmi.Client({
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
      this.account.status = AccountStatus.Online;
      this.account.connectedAt = Date.now();
      this.events.onConnected?.(this.emitStatus());
      if (loadConfig().viewbotEnabled) {
        void this.startViewerMode();
      }
      this.startMessageLoop();
    } catch (error) {
      this.account.status = AccountStatus.Error;
      this.account.lastError = (error as Error).message;
      logger.error("Bot connect failed", { error, user: this.account.username });
      this.events.onDisconnected?.(this.emitStatus(), "connect_failed");
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    this.isStopping = true;
    this.stopMessageLoop();

    if (this.isViewing) {
      await this.viewerService.stopViewing(this.account.username);
      this.isViewing = false;
      this.account.isViewing = false;
    }

    try {
      await this.client.disconnect();
      this.account.status = AccountStatus.Idle;
    } catch (error) {
      logger.warn("Bot disconnect failed", { error, user: this.account.username });
    } finally {
      try {
        this.client.removeAllListeners();
      } catch {
        // ignore
      }
      this.isStopping = false;
      this.eventsAttached = false;
      this.client = null;
    }
  }

  async sendImmediate(text: string, skipTypingDelay = true): Promise<void> {
    if (!this.client) return;
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
    } catch (error) {
      logger.error("Immediate send failed", { error, user: this.account.username });
    }
  }

  private startMessageLoop(): void {
    if (this.messageTimer) return;
    const schedule = (): void => {
      if (this.isStopping || !this.client) return;
      const delay = this.getCooldownMs();
      this.messageTimer = setTimeout(() => {
        void this.loopTick();
      }, delay);
    };
    schedule();
  }

  private stopMessageLoop(): void {
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
  }

  private async loopTick(): Promise<void> {
    try {
      await this.tryToSendMessage();
    } catch (error) {
      logger.error("Message loop error", { error, user: this.account.username });
    } finally {
      if (!this.isStopping && this.client) {
        this.messageTimer = null;
        this.startMessageLoop();
      }
    }
  }

  private async tryToSendMessage(): Promise<void> {
    if (!this.client || !this.scheduler) return;

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
    } catch (error) {
      logger.error("Send message failed", { error, user: this.account.username });
    }
  }

  private getCooldownMs(): number {
    const config = loadConfig();
    const min = Math.min(config.messageCooldownMinSeconds, config.messageCooldownMaxSeconds);
    const max = Math.max(config.messageCooldownMinSeconds, config.messageCooldownMaxSeconds);
    const seconds = Math.floor(min + Math.random() * (max - min + 1));
    return seconds * 1000;
  }

  private getReadyState(): string {
    const clientAny = this.client as unknown as { readyState?: () => string | number };
    if (clientAny && typeof clientAny.readyState === "function") {
      const state = clientAny.readyState();
      return typeof state === "string" ? state : String(state);
    }
    return "unknown";
  }

  private wireEvents(client: Client): void {
    if (this.eventsAttached) return;
    client.removeAllListeners();
    client.on("connected", (address: string, port: number) => {
      logger.info("Connected", { user: this.account.username, address, port });
      this.account.status = AccountStatus.Online;
      this.events.onConnected?.(this.emitStatus());
    });

    client.on("logon", () => {
      logger.info("Logon", { user: this.account.username });
    });

    client.on("join", (channel: string, username: string, self: boolean) => {
      logger.info("Joined channel", { channel, username, self });
    });

    client.on("message", (_channel: string, tags: ChatUserstate, messageText: string, self: boolean) => {
      const author = tags["display-name"] ?? tags.username ?? "unknown";
      logger.debug("Chat message", { channel: _channel, author, self, text: messageText });
      if (self) return;
      const message: Message = {
        author,
        text: messageText,
        timestamp: Date.now(),
        mentions: [],
        isStreamer: false,
        isBot: false
      };
      this.events.onMessage?.(this.emitStatus(), message);
    });

    client.on("chat", (channel: string, tags: ChatUserstate, messageText: string, self: boolean) => {
      const author = tags["display-name"] ?? tags.username ?? "unknown";
      logger.debug("Chat event", { channel, author, self, text: messageText });
    });

    client.on("notice", (channel: string, msgid: string, messageText: string) => {
      logger.warn("Notice", { user: this.account.username, channel, msgid, message: messageText });
    });

    client.on("messagedeleted", (channel: string, username: string, deletedMessage: string) => {
      logger.warn("Message deleted", { channel, username, deletedMessage });
      this.events.onMessageDeleted?.(this.emitStatus(), "deleted");
    });

    client.on("timeout", (channel: string, username: string, reason: string, duration: number) => {
      logger.warn("Timeout", { channel, username, reason, duration });
      this.account.status = AccountStatus.Error;
      this.events.onTimeout?.(this.emitStatus(), "timeout");
    });

    client.on("ban", (channel: string, username: string, reason: string) => {
      logger.warn("Ban", { channel, username, reason });
      this.account.status = AccountStatus.Banned;
      this.events.onBan?.(this.emitStatus(), "ban");
    });

    client.on("disconnected", (reason: string) => {
      this.stopMessageLoop();
      logger.warn("Disconnected", { user: this.account.username, reason });
      if (this.isStopping) {
        this.account.status = AccountStatus.Idle;
        this.events.onDisconnected?.(this.emitStatus(), "manual");
        return;
      }
      this.account.status = AccountStatus.Error;
      this.account.lastError = reason;
      this.events.onDisconnected?.(this.emitStatus(), reason);
    });

    client.on("reconnect", () => {
      logger.info("Reconnect", { user: this.account.username });
    });
    this.eventsAttached = true;
  }

  private async applyTypingDelay(): Promise<void> {
    const min = Math.min(this.typingDelayMin, this.typingDelayMax);
    const max = Math.max(this.typingDelayMin, this.typingDelayMax);
    const delay = Math.floor(min + Math.random() * (max - min + 1));
    await sleep(delay);
  }

  private emitStatus(): BotState {
    this.account.isViewing = this.isViewing;
    return this.getState();
  }

  private async startViewerMode(): Promise<void> {
    try {
      const config = loadConfig();
      const viewerOptions = BrowserProfile.getRandomOptions(config);
      const success = await this.viewerService.startViewing(
        this.account.username,
        this.account.oauth,
        this.channel,
        viewerOptions
      );
      if (success) {
        this.isViewing = true;
        this.account.isViewing = true;
        this.events.onConnected?.(this.emitStatus());
      }
    } catch (error) {
      console.error(`Failed to start viewer mode for ${this.account.username}:`, error);
    }
  }
}
