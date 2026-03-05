import { AccountParseResult } from "../utils/types";
import { validateAccountLine } from "./AccountValidator";

export const parseAccountsText = (input: string): AccountParseResult => {
  const lines = input.split(/\r?\n/);
  const accounts = [] as AccountParseResult["accounts"];
  const errors = [] as AccountParseResult["errors"];

  lines.forEach((line, index) => {
    const result = validateAccountLine(line);
    if (result.ok) {
      accounts.push(result.account);
    } else if (line.trim() !== "") {
      errors.push({
        line: index + 1,
        raw: line,
        reason: result.reason
      });
    }
  });

  return { accounts, errors };
};

export const parseAccountsFileContent = (content: string): AccountParseResult =>
  parseAccountsText(content);
