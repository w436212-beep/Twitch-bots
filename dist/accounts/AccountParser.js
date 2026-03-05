"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAccountsFileContent = exports.parseAccountsText = void 0;
const AccountValidator_1 = require("./AccountValidator");
const parseAccountsText = (input) => {
    const lines = input.split(/\r?\n/);
    const accounts = [];
    const errors = [];
    lines.forEach((line, index) => {
        const result = (0, AccountValidator_1.validateAccountLine)(line);
        if (result.ok) {
            accounts.push(result.account);
        }
        else if (line.trim() !== "") {
            errors.push({
                line: index + 1,
                raw: line,
                reason: result.reason
            });
        }
    });
    return { accounts, errors };
};
exports.parseAccountsText = parseAccountsText;
const parseAccountsFileContent = (content) => (0, exports.parseAccountsText)(content);
exports.parseAccountsFileContent = parseAccountsFileContent;
