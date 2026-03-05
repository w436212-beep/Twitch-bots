import { RateLimiter as RateLimiterInterface, TokenBucketConfig } from "./types";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter implements RateLimiterInterface {
  private tokens: number;
  private lastRefill: number;
  private readonly config: TokenBucketConfig;

  constructor(config: TokenBucketConfig) {
    this.config = config;
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  canConsume(count: number): boolean {
    if (count <= 0) return true;
    this.refill();
    return this.tokens >= count;
  }

  consume(count: number): boolean {
    if (!this.canConsume(count)) return false;
    this.tokens -= count;
    return true;
  }

  async removeTokens(count: number): Promise<void> {
    if (count <= 0) return;
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

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;

    const intervals = Math.floor(elapsed / this.config.refillIntervalMs);
    if (intervals <= 0) return;

    const refillAmount = intervals * this.config.refillTokens;
    this.tokens = Math.min(this.config.capacity, this.tokens + refillAmount);
    this.lastRefill += intervals * this.config.refillIntervalMs;
  }

  private timeToNextToken(count: number): number {
    if (this.tokens >= count) return 0;
    const missing = count - this.tokens;
    const tokensPerInterval = this.config.refillTokens;
    const intervalsNeeded = Math.ceil(missing / tokensPerInterval);
    return Math.max(this.config.refillIntervalMs * intervalsNeeded, 50);
  }
}
