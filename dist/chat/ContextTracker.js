"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextTracker = exports.parseMentions = void 0;
const parseMentions = (text) => {
    const mentions = new Set();
    const regex = /@([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match[1])
            mentions.add(match[1].toLowerCase());
    }
    return Array.from(mentions);
};
exports.parseMentions = parseMentions;
class ContextTracker {
    contexts = new Map();
    maxMessages;
    mentionTimeoutMs;
    constructor(maxMessages = 10, mentionTimeoutMs = 3 * 60 * 1000) {
        this.maxMessages = maxMessages;
        this.mentionTimeoutMs = mentionTimeoutMs;
    }
    addMessage(botId, message, mentionedBot) {
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
    getContext(botId) {
        const state = this.contexts.get(botId);
        if (!state)
            return { messages: [], awaitingReply: false };
        const now = Date.now();
        if (state.lastMentionTs > 0 && now - state.lastMentionTs > this.mentionTimeoutMs) {
            this.contexts.set(botId, { messages: [], lastMentionTs: 0, awaitingReply: false });
            return { messages: [], awaitingReply: false };
        }
        return { messages: state.messages, awaitingReply: state.awaitingReply };
    }
    clearAwaiting(botId) {
        const state = this.contexts.get(botId);
        if (!state)
            return;
        state.awaitingReply = false;
        this.contexts.set(botId, state);
    }
    clear(botId) {
        this.contexts.delete(botId);
    }
}
exports.ContextTracker = ContextTracker;
