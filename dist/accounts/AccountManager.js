"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountManager = void 0;
const tmi_js_1 = __importDefault(require("tmi.js"));
const types_1 = require("../utils/types");
const AccountParser_1 = require("./AccountParser");
const Logger_1 = require("../utils/Logger");
const config_1 = require("../config/config");
const logger = (0, Logger_1.getLogger)("accounts");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class AccountManager {
    accounts = new Map();
    loadFromText(input) {
        const result = (0, AccountParser_1.parseAccountsText)(input);
        const deduped = this.removeDuplicates(result.accounts);
        this.accounts.clear();
        deduped.forEach((account) => this.accounts.set(account.username, account));
        logger.info("Accounts loaded", {
            total: result.accounts.length,
            deduped: deduped.length,
            errors: result.errors.length
        });
        return { accounts: deduped, errors: result.errors };
    }
    getAll() {
        return Array.from(this.accounts.values());
    }
    getByUsername(username) {
        return this.accounts.get(username);
    }
    updateStatus(username, status, lastError) {
        const account = this.accounts.get(username);
        if (!account)
            return;
        account.status = status;
        account.lastError = lastError;
        account.lastActive = (0, types_1.nowTs)();
        if (status === types_1.AccountStatus.Online && !account.connectedAt) {
            account.connectedAt = (0, types_1.nowTs)();
        }
    }
    incrementMessages(username) {
        const account = this.accounts.get(username);
        if (!account)
            return;
        account.messagesSent += 1;
        account.lastActive = (0, types_1.nowTs)();
    }
    async testConnections() {
        const config = (0, config_1.loadConfig)();
        const accounts = this.getAll();
        const batchSize = config.accountsTestBatchSize;
        for (let i = 0; i < accounts.length; i += batchSize) {
            const batch = accounts.slice(i, i + batchSize);
            await Promise.all(batch.map((account) => this.testAccount(account, config.channel)));
            if (i + batchSize < accounts.length) {
                const delay = this.randomDelay(config.accountsTestDelayMinMs, config.accountsTestDelayMaxMs);
                await sleep(delay);
            }
        }
    }
    async testAccount(account, channel) {
        const client = new tmi_js_1.default.Client({
            identity: {
                username: account.username,
                password: account.oauth
            },
            channels: [channel]
        });
        account.status = types_1.AccountStatus.Connecting;
        account.lastActive = (0, types_1.nowTs)();
        try {
            await client.connect();
            account.status = types_1.AccountStatus.Online;
            account.connectedAt = (0, types_1.nowTs)();
        }
        catch (error) {
            const message = error.message;
            account.status = types_1.AccountStatus.Error;
            account.lastError = message;
            logger.warn("Account test failed", { user: account.username, error: message });
        }
        finally {
            try {
                await client.disconnect();
            }
            catch {
                // ignore
            }
        }
    }
    removeDuplicates(accounts) {
        const seen = new Set();
        const result = [];
        for (const account of accounts) {
            if (seen.has(account.username))
                continue;
            seen.add(account.username);
            result.push(account);
        }
        return result;
    }
    randomDelay(minMs, maxMs) {
        const min = Math.min(minMs, maxMs);
        const max = Math.max(minMs, maxMs);
        return Math.floor(min + Math.random() * (max - min + 1));
    }
}
exports.AccountManager = AccountManager;
