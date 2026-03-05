import tmi from "tmi.js";
import { Account, AccountParseResult, AccountStatus, nowTs } from "../utils/types";
import { parseAccountsText } from "./AccountParser";
import { getLogger } from "../utils/Logger";
import { loadConfig } from "../config/config";

const logger = getLogger("accounts");

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class AccountManager {
  private accounts: Map<string, Account> = new Map();

  loadFromText(input: string): AccountParseResult {
    const result = parseAccountsText(input);
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

  getAll(): Account[] {
    return Array.from(this.accounts.values());
  }

  getByUsername(username: string): Account | undefined {
    return this.accounts.get(username);
  }

  updateStatus(username: string, status: AccountStatus, lastError?: string): void {
    const account = this.accounts.get(username);
    if (!account) return;
    account.status = status;
    account.lastError = lastError;
    account.lastActive = nowTs();
    if (status === AccountStatus.Online && !account.connectedAt) {
      account.connectedAt = nowTs();
    }
  }

  incrementMessages(username: string): void {
    const account = this.accounts.get(username);
    if (!account) return;
    account.messagesSent += 1;
    account.lastActive = nowTs();
  }

  async testConnections(): Promise<void> {
    const config = loadConfig();
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

  private async testAccount(account: Account, channel: string): Promise<void> {
    const client = new tmi.Client({
      connection: { secure: true },
      identity: {
        username: account.username,
        password: account.oauth
      },
      channels: [channel]
    });

    account.status = AccountStatus.Connecting;
    account.lastActive = nowTs();

    try {
      await client.connect();
      account.status = AccountStatus.Online;
      account.connectedAt = nowTs();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      account.status = AccountStatus.Error;
      account.lastError = message;
      logger.warn("Account test failed", { user: account.username, error: message });
    } finally {
      try {
        await client.disconnect();
      } catch {
        // ignore
      }
    }
  }

  private removeDuplicates(accounts: Account[]): Account[] {
    const seen = new Set<string>();
    const result: Account[] = [];
    for (const account of accounts) {
      if (seen.has(account.username)) continue;
      seen.add(account.username);
      result.push(account);
    }
    return result;
  }

  private randomDelay(minMs: number, maxMs: number): number {
    const min = Math.min(minMs, maxMs);
    const max = Math.max(minMs, maxMs);
    return Math.floor(min + Math.random() * (max - min + 1));
  }
}
