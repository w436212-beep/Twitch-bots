"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAccountLine = void 0;
const types_1 = require("../utils/types");
const Logger_1 = require("../utils/Logger");
const logger = (0, Logger_1.getLogger)("accounts");
const ACCOUNT_REGEX = /^([^:]+):([^:]+):([^:]+)$/;
const validateAccountLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed)
        return { ok: false, reason: "Empty line" };
    const match = ACCOUNT_REGEX.exec(trimmed);
    if (!match)
        return { ok: false, reason: "Invalid format" };
    const username = match[1]?.trim() ?? "";
    const password = match[2]?.trim() ?? "";
    let oauth = match[3]?.trim() ?? "";
    if (!(0, types_1.isNonEmptyString)(username) || !(0, types_1.isNonEmptyString)(password) || !(0, types_1.isNonEmptyString)(oauth)) {
        return { ok: false, reason: "Missing fields" };
    }
    if (!oauth.startsWith("oauth:")) {
        oauth = `oauth:${oauth}`;
    }
    const tokenPreview = oauth.replace(/^oauth:/, "").slice(0, 10);
    logger.debug("Parsed account token", { username, tokenPreview: `oauth:${tokenPreview}...` });
    const account = {
        username,
        password,
        oauth,
        status: types_1.AccountStatus.Idle,
        lastActive: (0, types_1.nowTs)(),
        messagesSent: 0
    };
    return { ok: true, account };
};
exports.validateAccountLine = validateAccountLine;
