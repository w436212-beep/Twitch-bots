import { Account, AccountStatus, isNonEmptyString, nowTs } from "../utils/types";
import { getLogger } from "../utils/Logger";

const logger = getLogger("accounts");

const ACCOUNT_REGEX = /^([^:]+):([^:]+):([^:]+)$/;

export const validateAccountLine = (line: string): { ok: true; account: Account } | { ok: false; reason: string } => {
  const trimmed = line.trim();
  if (!trimmed) return { ok: false, reason: "Empty line" };
  const match = ACCOUNT_REGEX.exec(trimmed);
  if (!match) return { ok: false, reason: "Invalid format" };

  const username = match[1]?.trim() ?? "";
  const password = match[2]?.trim() ?? "";
  let oauth = match[3]?.trim() ?? "";

  if (!isNonEmptyString(username) || !isNonEmptyString(password) || !isNonEmptyString(oauth)) {
    return { ok: false, reason: "Missing fields" };
  }

  if (!oauth.startsWith("oauth:")) {
    oauth = `oauth:${oauth}`;
  }

  const tokenPreview = oauth.replace(/^oauth:/, "").slice(0, 10);
  logger.debug("Parsed account token", { username, tokenPreview: `oauth:${tokenPreview}...` });

  const account: Account = {
    username,
    password,
    oauth,
    status: AccountStatus.Idle,
    lastActive: nowTs(),
    messagesSent: 0
  };

  return { ok: true, account };
};
