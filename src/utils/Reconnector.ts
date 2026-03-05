import { ReconnectConfig } from "./types";
import { getLogger } from "./Logger";

const logger = getLogger("utils");

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class Reconnector {
  private readonly config: ReconnectConfig;

  constructor(config: ReconnectConfig) {
    this.config = config;
  }

  async retry<T>(fn: () => Promise<T>, context: string): Promise<T | null> {
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        logger.warn("Reconnect attempt failed", { context, attempt, error });
        const delaySec = this.config.delaysSec[Math.min(attempt - 1, this.config.delaysSec.length - 1)] ?? 1;
        await sleep(delaySec * 1000);
      }
    }
    logger.error("Reconnect attempts exhausted", { context });
    return null;
  }
}
