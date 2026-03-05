"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowTs = exports.isBotMode = exports.isAccountStatus = exports.isNonEmptyString = exports.BotMode = exports.AccountStatus = void 0;
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["Idle"] = "idle";
    AccountStatus["Connecting"] = "connecting";
    AccountStatus["Online"] = "online";
    AccountStatus["Error"] = "error";
    AccountStatus["Banned"] = "banned";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
var BotMode;
(function (BotMode) {
    BotMode["Fixed"] = "fixed";
    BotMode["AI"] = "ai";
})(BotMode || (exports.BotMode = BotMode = {}));
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
exports.isNonEmptyString = isNonEmptyString;
const isAccountStatus = (value) => value === AccountStatus.Idle ||
    value === AccountStatus.Connecting ||
    value === AccountStatus.Online ||
    value === AccountStatus.Error ||
    value === AccountStatus.Banned;
exports.isAccountStatus = isAccountStatus;
const isBotMode = (value) => value === BotMode.Fixed || value === BotMode.AI;
exports.isBotMode = isBotMode;
const nowTs = () => Date.now();
exports.nowTs = nowTs;
