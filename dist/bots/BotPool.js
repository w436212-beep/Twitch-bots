"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotPool = void 0;
const config_1 = require("../config/config");
const Logger_1 = require("../utils/Logger");
const logger = (0, Logger_1.getLogger)("bots");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class BotPool {
    maxParallel;
    staggerMinMs;
    staggerMaxMs;
    constructor() {
        const config = (0, config_1.loadConfig)();
        this.maxParallel = config.maxParallelJoins;
        this.staggerMinMs = config.joinStaggerMinSec * 1000;
        this.staggerMaxMs = config.joinStaggerMaxSec * 1000;
    }
    async connectAll(bots) {
        const queue = [...bots];
        const workers = [];
        const worker = async () => {
            while (queue.length > 0) {
                const bot = queue.shift();
                if (!bot)
                    return;
                await bot.connect();
                await sleep(this.randomStagger());
            }
        };
        const parallel = Math.min(this.maxParallel, bots.length);
        for (let i = 0; i < parallel; i += 1) {
            workers.push(worker());
        }
        await Promise.all(workers).catch((error) => {
            logger.error("BotPool connectAll failed", { error });
        });
    }
    randomStagger() {
        const min = Math.min(this.staggerMinMs, this.staggerMaxMs);
        const max = Math.max(this.staggerMinMs, this.staggerMaxMs);
        return Math.floor(min + Math.random() * (max - min + 1));
    }
}
exports.BotPool = BotPool;
