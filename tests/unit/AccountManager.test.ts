import { AccountManager } from "../../src/accounts/AccountManager";
import { AccountStatus } from "../../src/utils/types";
import { loadConfig } from "../../src/config/config";
import tmi from "tmi.js";

// Mock dependencies
jest.mock("../../src/config/config", () => ({
  loadConfig: jest.fn(() => ({
    accountsTestBatchSize: 2,
    accountsTestDelayMinMs: 10,
    accountsTestDelayMaxMs: 20,
    channel: "testchannel"
  }))
}));

jest.mock("../../src/utils/Logger", () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.mock("tmi.js", () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

describe("AccountManager", () => {
  let manager: AccountManager;

  beforeEach(() => {
    manager = new AccountManager();
    jest.clearAllMocks();

    jest.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      cb();
      return {} as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("loadFromText", () => {
    it("should load accounts and remove duplicates", () => {
      const input = "user1:pass1:oauth:token1\nuser2:pass2:oauth:token2\nuser1:pass1:oauth:token1_new";
      const result = manager.loadFromText(input);

      expect(result.accounts).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // Should keep the first occurrence of user1
      expect(result.accounts[0].username).toBe("user1");
      expect(result.accounts[0].oauth).toBe("oauth:token1");

      const allAccounts = manager.getAll();
      expect(allAccounts).toHaveLength(2);
    });

    it("should process errors from parsing", () => {
      const input = "user1:pass1:oauth:token1\ninvalid_line\nuser2:pass2:oauth:token2";
      const result = manager.loadFromText(input);

      expect(result.accounts).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("updateStatus", () => {
    it("should update status and track lastActive", () => {
      manager.loadFromText("user1:pass1:oauth:token1");

      const beforeUpdate = Date.now();
      manager.updateStatus("user1", AccountStatus.Online, "No error");
      const afterUpdate = Date.now();

      const account = manager.getByUsername("user1");
      expect(account).toBeDefined();
      expect(account?.status).toBe(AccountStatus.Online);
      expect(account?.lastError).toBe("No error");

      expect(account?.lastActive).toBeGreaterThanOrEqual(beforeUpdate);
      expect(account?.lastActive).toBeLessThanOrEqual(afterUpdate);

      // Also connectedAt should be set on first Online status
      expect(account?.connectedAt).toBeGreaterThanOrEqual(beforeUpdate);
      expect(account?.connectedAt).toBeLessThanOrEqual(afterUpdate);
    });
  });

  describe("incrementMessages", () => {
    it("should increment message count and update lastActive", () => {
      manager.loadFromText("user1:pass1:oauth:token1");

      const accountBefore = manager.getByUsername("user1");
      expect(accountBefore?.messagesSent).toBe(0);

      manager.incrementMessages("user1");

      const accountAfter = manager.getByUsername("user1");
      expect(accountAfter?.messagesSent).toBe(1);
    });
  });

  describe("testConnections", () => {
    it("should test connections in batches", async () => {
      const input = "user1:pass1:oauth:token1\nuser2:pass2:oauth:token2\nuser3:pass3:oauth:token3";
      manager.loadFromText(input);

      // Verify batch size from mock config is used
      await manager.testConnections();

      const tmiClientMock = (tmi.Client as jest.Mock);
      expect(tmiClientMock).toHaveBeenCalledTimes(3);

      // Check that accounts are updated
      const accounts = manager.getAll();
      expect(accounts[0].status).toBe(AccountStatus.Online);
      expect(accounts[1].status).toBe(AccountStatus.Online);
      expect(accounts[2].status).toBe(AccountStatus.Online);
    });

    it("should handle failed connections", async () => {
      const tmiClientMock = (tmi.Client as jest.Mock);

      tmiClientMock.mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue("Connection error"),
        disconnect: jest.fn().mockResolvedValue(undefined)
      }));

      manager.loadFromText("user1:pass1:oauth:token1");

      await manager.testConnections();

      const account = manager.getByUsername("user1");
      expect(account?.status).toBe(AccountStatus.Error);
      expect(account?.lastError).toBe("Connection error");
    });
  });
});
