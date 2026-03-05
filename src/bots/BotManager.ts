import fs from "fs";
import path from "path";
import { Account, AccountStatus, BotState, Message, AppConfig } from "../utils/types";
import { IndividualBot, BotScheduler } from "./IndividualBot";
import { BotPool } from "./BotPool";
import { getLogger } from "../utils/Logger";
import { ChatLogger } from "../chat/ChatLogger";
import { loadConfig } from "../config/config";
import { parseMentions, ContextTracker } from "../chat/ContextTracker";
import { MessageGenerator } from "../chat/MessageGenerator";
import { ConversationEngine } from "../chat/ConversationEngine";
import { AIService } from "../services/AIService";
import { Database } from "../database/Database";
import { ViewerService } from "../services/ViewerService";

const logger = getLogger("bots");

export interface BotManagerEvents {
  onAccountStatusChanged?: (account: Account) => void;
  onChatMessage?: (message: Message) => void;
}

export class BotManager {
  private readonly accountManager: { getAll: () => Account[]; updateStatus: (username: string, status: AccountStatus, lastError?: string) => void };
  private configUpdateLock: Promise<void> = Promise.resolve();
  private readonly pool: BotPool;
  private readonly chatLogger?: ChatLogger;
  private readonly events?: BotManagerEvents;
  private bots: Map<string, IndividualBot> = new Map();
  private readonly contextTracker: ContextTracker;
  private readonly messageGenerator: MessageGenerator;
  private readonly conversationEngine: ConversationEngine;
  private messagesLastMinute: number[] = [];
  private primaryListenerId: string | null = null;
  private globalLimit = 0;
  private globalLimitUpdatedAt = 0;
  private floatingInterval: NodeJS.Timeout | null = null;
  private floatingTimeout: NodeJS.Timeout | null = null;
  private floatingInProgress = false;
  private floatingStopRequested = false;
  private readonly viewerService: ViewerService;
  private viewerStatsInterval: NodeJS.Timeout | null = null;
  private chatHistory: Message[] = [];
  private aiService: AIService | null = null;
  private readonly onAiCostIncrement?: (delta: number) => void;
  private readonly onAiUsageIncrement?: (data: { promptTokens: number; completionTokens: number; cacheHit: boolean }) => void;
  private readonly db?: Database;
  private readonly onSystemNotice?: (message: string, type: "error" | "success") => void;
  private readonly laughVariants = [
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
  private readonly greetingVariants = [
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

  constructor(
    accountManager: { getAll: () => Account[]; updateStatus: (username: string, status: AccountStatus, lastError?: string) => void },
    chatLogger?: ChatLogger,
    events?: BotManagerEvents,
    onAiCostIncrement?: (delta: number) => void,
    onAiUsageIncrement?: (data: { promptTokens: number; completionTokens: number; cacheHit: boolean }) => void,
    db?: Database,
    onSystemNotice?: (message: string, type: "error" | "success") => void
  ) {
    this.accountManager = accountManager;
    this.pool = new BotPool();
    this.chatLogger = chatLogger;
    this.events = events;
    this.onAiCostIncrement = onAiCostIncrement;
    this.onAiUsageIncrement = onAiUsageIncrement;
    this.db = db;
    this.onSystemNotice = onSystemNotice;
    this.viewerService = new ViewerService(this.onSystemNotice);
    this.contextTracker = new ContextTracker();
    this.messageGenerator = new MessageGenerator();
    this.conversationEngine = new ConversationEngine(this.contextTracker, this.messageGenerator, this);
    this.viewerStatsInterval = setInterval(() => {
      if (!loadConfig().viewbotEnabled) return;
      const stats = this.viewerService.getStats();
      console.log(
        `📊 Viewbot stats: ${stats.activeBrowsers} browsers, ~${stats.estimatedRAM} MB RAM, ~${stats.estimatedBandwidth} Mbps`
      );
    }, 60000);
  }

  initialize(): void {
    this.bots.clear();
    this.chatHistory = [];
    const config = loadConfig();
    const streamerLower = config.streamerName.toLowerCase();
    logger.info("BotManager init", { channel: config.channel });
    this.primaryListenerId = null;
    this.aiService = new AIService(
      config,
      this.accountManager.getAll().map((a) => a.username),
      this.onAiCostIncrement,
      this.onAiUsageIncrement,
      this.db
    );

    this.accountManager.getAll().forEach((account) => {
      if (!this.primaryListenerId) {
        this.primaryListenerId = account.username;
      }
      const scheduler: BotScheduler = {
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

      const bot = new IndividualBot(account, this.viewerService, {
        onMessage: (_state: BotState, message: Message) => {
          if (!this.shouldProcessMessage(account.username)) {
            return;
          }
          this.appendChatHistory(message);
          void this.handleChatMessage(message);

          const mentions = parseMentions(message.text);
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
          this.accountManager.updateStatus(account.username, AccountStatus.Online);
          this.events?.onAccountStatusChanged?.(account);
        },
        onDisconnected: (_state, reason) => {
          if (reason === "manual") {
            this.accountManager.updateStatus(account.username, AccountStatus.Idle);
          } else {
            this.accountManager.updateStatus(account.username, AccountStatus.Error, reason);
          }
          if (this.primaryListenerId === account.username) {
            this.primaryListenerId = null;
          }
          this.events?.onAccountStatusChanged?.(account);
        },
        onBan: () => {
          this.accountManager.updateStatus(account.username, AccountStatus.Banned, "ban");
          this.events?.onAccountStatusChanged?.(account);
          void this.rotateBot(account.username);
        },
        onTimeout: () => {
          this.accountManager.updateStatus(account.username, AccountStatus.Error, "timeout");
          this.events?.onAccountStatusChanged?.(account);
          void this.rotateBot(account.username);
        }
      }, scheduler, account.username === this.primaryListenerId);

      this.bots.set(account.username, bot);
    });
  }

  private async rotateBot(bannedUsername: string): Promise<void> {
    const oldBot = this.bots.get(bannedUsername);
    if (oldBot) {
      await oldBot.disconnect();
      this.bots.delete(bannedUsername);
    }

    const idleAccounts = this.accountManager.getAll().filter(a => a.status === AccountStatus.Idle);
    if (idleAccounts.length === 0) {
      logger.warn("No idle accounts left for rotation", { bannedUsername });
      return;
    }

    const nextAccount = idleAccounts[0];
    logger.info("Rotating account", { bannedUsername, newUsername: nextAccount.username });

    const scheduler: BotScheduler = {
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

    const config = loadConfig();
    const streamerLower = config.streamerName.toLowerCase();

    const bot = new IndividualBot(nextAccount, this.viewerService, {
      onMessage: (_state, message) => {
        if (!this.shouldProcessMessage(nextAccount.username)) return;
        this.appendChatHistory(message);
        void this.handleChatMessage(message);

        const mentions = parseMentions(message.text);
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

        logger.debug("Message received", { bot: nextAccount.username });
      },
      onConnected: () => {
        this.accountManager.updateStatus(nextAccount.username, AccountStatus.Online);
        this.events?.onAccountStatusChanged?.(nextAccount);
      },
      onDisconnected: (_state, reason) => {
        if (reason === "manual") {
          this.accountManager.updateStatus(nextAccount.username, AccountStatus.Idle);
        } else {
          this.accountManager.updateStatus(nextAccount.username, AccountStatus.Error, reason);
        }
        if (this.primaryListenerId === nextAccount.username) {
          this.primaryListenerId = null;
        }
        this.events?.onAccountStatusChanged?.(nextAccount);
      },
      onBan: () => {
        this.accountManager.updateStatus(nextAccount.username, AccountStatus.Banned, "ban");
        this.events?.onAccountStatusChanged?.(nextAccount);
        void this.rotateBot(nextAccount.username);
      },
      onTimeout: () => {
        this.accountManager.updateStatus(nextAccount.username, AccountStatus.Error, "timeout");
        this.events?.onAccountStatusChanged?.(nextAccount);
        void this.rotateBot(nextAccount.username);
      }
    }, scheduler, nextAccount.username === this.primaryListenerId);

    this.bots.set(nextAccount.username, bot);
    await bot.connect();
  }

  async startAll(): Promise<void> {
    const list = Array.from(this.bots.values());
    await this.pool.connectAll(list);
    this.startFloating();
  }

  async stopAll(): Promise<void> {
    this.stopFloating();
    const list = Array.from(this.bots.values());
    await Promise.all(list.map((bot) => bot.disconnect()));
    await this.viewerService.stopAll();
    this.accountManager.getAll().forEach((account) => {
      this.accountManager.updateStatus(account.username, AccountStatus.Idle);
      this.events?.onAccountStatusChanged?.(account);
    });
  }

  getBot(username: string): IndividualBot | undefined {
    return this.bots.get(username);
  }

  getOnlineBots(): IndividualBot[] {
    return Array.from(this.bots.values()).filter((bot) => bot.getState().account.status === AccountStatus.Online);
  }

  getOnlineCount(): number {
    let count = 0;
    this.accountManager.getAll().forEach((account) => {
      if (account.status === AccountStatus.Online) count += 1;
    });
    return count;
  }

  canSendGlobally(): boolean {
    const now = Date.now();
    this.messagesLastMinute = this.messagesLastMinute.filter((ts) => now - ts <= 60_000);
    const limit = this.getGlobalLimit();
    return this.messagesLastMinute.length < limit;
  }

  recordMessage(): void {
    this.messagesLastMinute.push(Date.now());
  }

  broadcastCustomMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const onlineBots = this.getOnlineBots();
    if (onlineBots.length === 0) return;
    logger.info(`Broadcasting custom message to ${onlineBots.length} bots with 1-4 sec delays`);
    onlineBots.forEach((bot) => {
      const delay = Math.floor(1000 + Math.random() * 3000);
      setTimeout(() => {
        void bot.sendImmediate(trimmed, true);
      }, delay);
    });
  }

  triggerGreeting(): void {
    const onlineBots = this.getOnlineBots();
    if (onlineBots.length === 0) return;
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

  async triggerEmotion(): Promise<void> {
    const onlineBots = this.getOnlineBots();
    if (onlineBots.length === 0) return;

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

  getConfig(): AppConfig {
    return loadConfig();
  }

  async updateConfig(newConfig: Partial<AppConfig>): Promise<AppConfig> {
    await this.configUpdateLock;
    let releaseLock: () => void = () => {};
    this.configUpdateLock = new Promise((resolve) => {
      releaseLock = resolve;
    });

    try {
      const current = loadConfig();
      const updated = { ...current, ...newConfig };
      const configPath = path.resolve(process.cwd(), "config.json");
      await fs.promises.writeFile(configPath, JSON.stringify(updated, null, 2), "utf8");
      const after = loadConfig();
      logger.info("Config updated", { keys: Object.keys(newConfig) });

      if (this.aiService) {
        this.aiService.updateConfig(after);
        if (after.aiEnabled) {
          logger.info("AI mode enabled");
        } else {
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
    } finally {
      releaseLock();
    }
  }

  private shuffle(list: IndividualBot[]): IndividualBot[] {
    const array = [...list];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private shouldProcessMessage(botId: string): boolean {
    if (!this.primaryListenerId) {
      this.primaryListenerId = botId;
      return true;
    }
    return this.primaryListenerId === botId;
  }

  private appendChatHistory(message: Message): void {
    this.chatHistory.push(message);
    if (this.chatHistory.length > 20) {
      this.chatHistory.splice(0, this.chatHistory.length - 20);
    }
  }

  private async handleChatMessage(message: Message): Promise<void> {
    const config = loadConfig();
    if (!config.aiEnabled || !this.aiService) return;
    if (!this.aiService.isBotMessage(message.author)) return;

    if (Math.random() >= config.aiResponseChance) return;

    const onlineBots = this.getOnlineBots().filter(
      (bot) => bot.getUsername().toLowerCase() !== message.author.toLowerCase()
    );
    if (onlineBots.length === 0) return;

    const responder = onlineBots[Math.floor(Math.random() * onlineBots.length)];
    const response = await this.aiService.generateResponse(this.chatHistory.slice(-5), responder.getUsername());
    if (!response) return;

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

  private startFloating(): void {
    const config = loadConfig();
    this.floatingStopRequested = false;
    if (!config.floatingEnabled) return;
    if (this.floatingInterval) return;
    const intervalMs = Math.max(1, config.floatingIntervalMinutes) * 60 * 1000;
    this.floatingInterval = setInterval(() => {
      void this.floatBots();
    }, intervalMs);
  }

  private stopFloating(): void {
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

  private async floatBots(): Promise<void> {
    if (this.floatingInProgress) return;
    const config = loadConfig();
    if (!config.floatingEnabled) return;

    const onlineBots = this.getOnlineBots();
    if (onlineBots.length === 0) return;

    const count = Math.floor(onlineBots.length * (config.floatingPercent / 100));
    if (count <= 0) return;

    this.floatingInProgress = true;

    const selected = this.shuffle(onlineBots).slice(0, count);
    logger.info(`Floating: disconnecting ${selected.length}/${onlineBots.length} bots`);

    await Promise.all(selected.map((bot) => bot.disconnect()));

    const delayMs = Math.floor(30_000 + Math.random() * 30_000);
    this.floatingTimeout = setTimeout(() => {
      void this.reconnectFloatingBots(selected);
    }, delayMs);
  }

  private async reconnectFloatingBots(bots: IndividualBot[]): Promise<void> {
    try {
      if (this.floatingStopRequested) return;
      let reconnected = 0;
      for (const bot of bots) {
        if (this.floatingStopRequested) break;
        const stagger = Math.floor(2000 + Math.random() * 1000);
        await new Promise((resolve) => setTimeout(resolve, stagger));
        await bot.connect();
        reconnected += 1;
      }
      logger.info(`Floating: reconnected ${reconnected} bots`);
    } finally {
      this.floatingInProgress = false;
      this.floatingTimeout = null;
    }
  }

  private getGlobalLimit(): number {
    const config = loadConfig();
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