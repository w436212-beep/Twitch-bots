import { Message } from "../utils/types";

export const parseMentions = (text: string): string[] => {
  const mentions = new Set<string>();
  const regex = /@([a-zA-Z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) mentions.add(match[1].toLowerCase());
  }
  return Array.from(mentions);
};

interface ContextState {
  messages: Message[];
  lastMentionTs: number;
  awaitingReply: boolean;
}

export interface BotContext {
  messages: Message[];
  awaitingReply: boolean;
}

export class ContextTracker {
  private readonly contexts: Map<string, ContextState> = new Map();
  private readonly maxMessages: number;
  private readonly mentionTimeoutMs: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxMessages = 10, mentionTimeoutMs = 3 * 60 * 1000) {
    this.maxMessages = maxMessages;
    this.mentionTimeoutMs = mentionTimeoutMs;
    // Periodically clean up stale contexts to prevent memory leaks over long sessions
    this.cleanupInterval = setInterval(() => this.cleanupStaleContexts(), 5 * 60 * 1000);
  }

  private cleanupStaleContexts(): void {
    const now = Date.now();
    for (const [botId, state] of this.contexts.entries()) {
      // If the context hasn't been active (based on last message timestamp) for 30 minutes, remove it
      if (state.messages.length > 0) {
        const lastMsgTime = state.messages[state.messages.length - 1].timestamp;
        if (now - lastMsgTime > 30 * 60 * 1000) {
          this.contexts.delete(botId);
        }
      } else {
        this.contexts.delete(botId);
      }
    }
  }

  addMessage(botId: string, message: Message, mentionedBot: boolean): void {
    const state = this.contexts.get(botId) ?? { messages: [], lastMentionTs: 0, awaitingReply: false };
    state.messages.push(message);
    if (state.messages.length > this.maxMessages) {
      state.messages.splice(0, state.messages.length - this.maxMessages);
    }
    if (mentionedBot) {
      state.lastMentionTs = message.timestamp;
      state.awaitingReply = true;
    }
    this.contexts.set(botId, state);
  }

  getContext(botId: string): BotContext {
    const state = this.contexts.get(botId);
    if (!state) return { messages: [], awaitingReply: false };
    const now = Date.now();
    if (state.lastMentionTs > 0 && now - state.lastMentionTs > this.mentionTimeoutMs) {
      this.contexts.set(botId, { messages: [], lastMentionTs: 0, awaitingReply: false });
      return { messages: [], awaitingReply: false };
    }
    return { messages: state.messages, awaitingReply: state.awaitingReply };
  }

  clearAwaiting(botId: string): void {
    const state = this.contexts.get(botId);
    if (!state) return;
    state.awaitingReply = false;
    this.contexts.set(botId, state);
  }

  clear(botId: string): void {
    this.contexts.delete(botId);
  }
}
