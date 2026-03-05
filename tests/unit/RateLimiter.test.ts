import { RateLimiter } from "../../src/utils/RateLimiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      capacity: 20,
      refillTokens: 20,
      refillIntervalMs: 30000
    });
  });

  afterEach(() => {
  });

  it("should initialize with full capacity", () => {
    expect(limiter.getTokens()).toBe(20);
  });

  it("should allow consuming within capacity", () => {
    expect(limiter.canConsume(5)).toBe(true);
    expect(limiter.consume(5)).toBe(true);
    expect(limiter.getTokens()).toBe(15);
  });

  it("should block consuming beyond capacity", () => {
    expect(limiter.canConsume(21)).toBe(false);
    expect(limiter.consume(21)).toBe(false);
    expect(limiter.getTokens()).toBe(20);
  });

});
