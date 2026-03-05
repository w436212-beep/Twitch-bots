import { parseAccountsText } from "../../src/accounts/AccountParser";
import { AccountStatus } from "../../src/utils/types";

// Mock dependencies
jest.mock("../../src/utils/Logger", () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

describe("AccountParser", () => {
  it("should parse valid accounts correctly", () => {
    const input = "user1:pass1:oauth:token1\nuser2:pass2:oauth:token2";
    const result = parseAccountsText(input);

    expect(result.accounts).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    expect(result.accounts[0].username).toEqual("user1");
    expect(result.accounts[0].oauth).toEqual("oauth:token1");
    expect(result.accounts[0].status).toEqual(AccountStatus.Idle);

    expect(result.accounts[1].username).toEqual("user2");
    expect(result.accounts[1].oauth).toEqual("oauth:token2");
    expect(result.accounts[1].status).toEqual(AccountStatus.Idle);
  });

  it("should enforce oauth prefix", () => {
    const input = "user1:pass1:token1\nuser2:pass2:oauth:token2";
    const result = parseAccountsText(input);

    expect(result.accounts).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.accounts[0].oauth).toEqual("oauth:token1");
  });

  it("should reject malformed input", () => {
    const input = "user1\nuser2:pass2:oauth:token2:extra\nuser3:pass3:oauth:token3";
    const result = parseAccountsText(input);

    expect(result.accounts).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
  });

  it("should handle empty lines gracefully", () => {
    const input = "user1:pass1:oauth:token1\n\n\nuser2:pass2:oauth:token2\n";
    const result = parseAccountsText(input);

    expect(result.accounts).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });
});
