import { IndividualBot } from "./IndividualBot";
import { loadConfig } from "../config/config";
import { getLogger } from "../utils/Logger";

const logger = getLogger("bots");

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class BotPool {
  private readonly maxParallel: number;
  private readonly staggerMinMs: number;
  private readonly staggerMaxMs: number;

  constructor() {
    const config = loadConfig();
    this.maxParallel = config.maxParallelJoins;
    this.staggerMinMs = config.joinStaggerMinSec * 1000;
    this.staggerMaxMs = config.joinStaggerMaxSec * 1000;
  }

  async connectAll(bots: IndividualBot[]): Promise<void> {
    const queue = [...bots];
    const workers: Promise<void>[] = [];

    const worker = async (delayStartMs: number): Promise<void> => {
      await sleep(delayStartMs);
      while (queue.length > 0) {
        const bot = queue.shift();
        if (!bot) return;
        await bot.connect();
        await sleep(this.randomStagger());
      }
    };

    const parallel = Math.min(this.maxParallel, bots.length);
    for (let i = 0; i < parallel; i += 1) {
      // Add initial random jitter for each worker to avoid stampeding herd on boot
      const jitterMs = Math.floor(Math.random() * 2000) * i;
      workers.push(worker(jitterMs));
    }

    await Promise.all(workers).catch((error) => {
      logger.error("BotPool connectAll failed", { error });
    });
  }

  private randomStagger(): number {
    const min = Math.min(this.staggerMinMs, this.staggerMaxMs);
    const max = Math.max(this.staggerMinMs, this.staggerMaxMs);
    return Math.floor(min + Math.random() * (max - min + 1));
  }
}
