import { Reconnector } from "../../src/utils/Reconnector";
import { getLogger } from "../../src/utils/Logger";

// Mock dependencies
jest.mock("../../src/utils/Logger", () => ({
  getLogger: jest.fn(() => ({
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

const mockSleep = jest.fn();
jest.mock("timers/promises", () => ({
  setTimeout: mockSleep
}));

describe("Reconnector", () => {
  let reconnector: Reconnector;
  let loggerWarn: jest.Mock;
  let loggerError: jest.Mock;

  beforeEach(() => {
    reconnector = new Reconnector({
      maxAttempts: 3,
      delaysSec: [1, 2, 4]
    });
    jest.clearAllMocks();

    // Create a manual sleep mock
    jest.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      cb();
      return {} as any;
    });

    const logger = getLogger("utils");
    loggerWarn = logger.warn as jest.Mock;
    loggerError = logger.error as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return successful result on first attempt", async () => {
    const fn = jest.fn().mockResolvedValue("success");
    const result = await reconnector.retry(fn, "test-context");

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and eventually succeed", async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockResolvedValueOnce("success");

    const result = await reconnector.retry(fn, "test-context");

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should exhaust max attempts and log error", async () => {
    const fn = jest.fn()
      .mockRejectedValue(new Error("fail continually"));

    const result = await reconnector.retry(fn, "test-context");

    expect(result).toBeNull();
    expect(fn).toHaveBeenCalledTimes(3);

    expect(loggerWarn).toHaveBeenCalledTimes(3);
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith("Reconnect attempts exhausted", { context: "test-context" });
  });

  it("should apply correct backoff delays", async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValueOnce("success");

    const result = await reconnector.retry(fn, "test-context");

    expect(result).toBe("success");
    expect(global.setTimeout).toHaveBeenCalledTimes(2);
    // setTimeout receives ms
    expect(global.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 1000);
    expect(global.setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 2000);
  });
});
