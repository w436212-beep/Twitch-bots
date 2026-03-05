"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class RateLimiter {
    tokens;
    lastRefill;
    config;
    constructor(config) {
        this.config = config;
        this.tokens = config.capacity;
        this.lastRefill = Date.now();
    }
    getTokens() {
        this.refill();
        return this.tokens;
    }
    canConsume(count) {
        if (count <= 0)
            return true;
        this.refill();
        return this.tokens >= count;
    }
    consume(count) {
        if (!this.canConsume(count))
            return false;
        this.tokens -= count;
        return true;
    }
    async removeTokens(count) {
        if (count <= 0)
            return;
        while (true) {
            this.refill();
            if (this.tokens >= count) {
                this.tokens -= count;
                return;
            }
            const waitMs = this.timeToNextToken(count);
            await sleep(waitMs);
        }
    }
    refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        if (elapsed <= 0)
            return;
        const intervals = Math.floor(elapsed / this.config.refillIntervalMs);
        if (intervals <= 0)
            return;
        const refillAmount = intervals * this.config.refillTokens;
        this.tokens = Math.min(this.config.capacity, this.tokens + refillAmount);
        this.lastRefill += intervals * this.config.refillIntervalMs;
    }
    timeToNextToken(count) {
        if (this.tokens >= count)
            return 0;
        const missing = count - this.tokens;
        const tokensPerInterval = this.config.refillTokens;
        const intervalsNeeded = Math.ceil(missing / tokensPerInterval);
        return Math.max(this.config.refillIntervalMs * intervalsNeeded, 50);
    }
}
exports.RateLimiter = RateLimiter;
