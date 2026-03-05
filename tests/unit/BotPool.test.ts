import { BotPool } from "../../src/bots/BotPool";
import { IndividualBot } from "../../src/bots/IndividualBot";
import { loadConfig } from "../../src/config/config";
import { getLogger } from "../../src/utils/Logger";

jest.mock("../../src/config/config", () => ({
  loadConfig: jest.fn(() => ({
    maxParallelJoins: 2,
    joinStaggerMinSec: 1,
    joinStaggerMaxSec: 2
  }))
}));

jest.mock("../../src/utils/Logger", () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe("BotPool", () => {
  let pool: BotPool;
  let mockBots: jest.Mocked<IndividualBot>[];

  beforeEach(() => {
    pool = new BotPool();
    mockBots = [
      { connect: jest.fn().mockResolvedValue(undefined) } as any,
      { connect: jest.fn().mockResolvedValue(undefined) } as any,
      { connect: jest.fn().mockResolvedValue(undefined) } as any,
      { connect: jest.fn().mockResolvedValue(undefined) } as any
    ];

    jest.spyOn(global, "setTimeout").mockImplementation((cb: any, ms: any) => {
      cb();
      return {} as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should process bots with max parallel workers", async () => {
    await pool.connectAll(mockBots);

    expect(mockBots[0].connect).toHaveBeenCalled();
    expect(mockBots[1].connect).toHaveBeenCalled();
    expect(mockBots[2].connect).toHaveBeenCalled();
    expect(mockBots[3].connect).toHaveBeenCalled();

    // Check sleep calls for stagger
    expect(global.setTimeout).toHaveBeenCalledTimes(6); // 2 jitter starts + 4 staggered joins
  });

  it("should handle empty bots list", async () => {
    await pool.connectAll([]);
    expect(global.setTimeout).toHaveBeenCalledTimes(0);
  });
});
