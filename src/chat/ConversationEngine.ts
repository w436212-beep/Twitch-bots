import { ContextTracker } from "./ContextTracker";
import { MessageGenerator } from "./MessageGenerator";
import { IndividualBot } from "../bots/IndividualBot";

interface BotManagerLike {
  getOnlineBots(): IndividualBot[];
}

export class ConversationEngine {
  private readonly contextTracker: ContextTracker;
  private readonly messageGenerator: MessageGenerator;
  private readonly botManager: BotManagerLike;

  constructor(contextTracker: ContextTracker, messageGenerator: MessageGenerator, botManager: BotManagerLike) {
    this.contextTracker = contextTracker;
    this.messageGenerator = messageGenerator;
    this.botManager = botManager;
  }

  async generateMessage(bot: IndividualBot): Promise<string | null> {
    const context = this.contextTracker.getContext(bot.getId());

    if (context.awaitingReply && Math.random() < 0.9) {
      const reply = this.messageGenerator.generateReply(bot.getId());
      this.contextTracker.clearAwaiting(bot.getId());
      return reply;
    }

    const roll = Math.random() * 100;
    if (roll < 30) return this.messageGenerator.generateReaction(bot.getId());
    if (roll < 55) return this.messageGenerator.generateStreamerQuestion(bot.getId());
    if (roll < 75) return this.messageGenerator.generateChatComment(bot.getId());
    if (roll < 90) return this.messageGenerator.generateIdle(bot.getId());

    return this.startBotDialog(bot);
  }

  private startBotDialog(bot: IndividualBot): string | null {
    const onlineBots = this.botManager.getOnlineBots().filter((b) => b.getId() !== bot.getId());
    if (onlineBots.length === 0) return null;
    const target = onlineBots[Math.floor(Math.random() * onlineBots.length)];
    const question = this.messageGenerator.generateBotQuestion(bot.getId());
    return `@${target.getUsername()} ${question}`;
  }
}
