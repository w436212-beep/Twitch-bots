"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reconnector = void 0;
const Logger_1 = require("./Logger");
const logger = (0, Logger_1.getLogger)("utils");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class Reconnector {
    config;
    constructor(config) {
        this.config = config;
    }
    async retry(fn, context) {
        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
            try {
                return await fn();
            }
            catch (error) {
                logger.warn("Reconnect attempt failed", { context, attempt, error });
                const delaySec = this.config.delaysSec[Math.min(attempt - 1, this.config.delaysSec.length - 1)] ?? 1;
                await sleep(delaySec * 1000);
            }
        }
        logger.error("Reconnect attempts exhausted", { context });
        return null;
    }
}
exports.Reconnector = Reconnector;
