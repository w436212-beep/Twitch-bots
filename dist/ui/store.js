"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initIpc = exports.useUIStore = void 0;
const zustand_1 = require("zustand");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
exports.useUIStore = (0, zustand_1.create)((set) => ({
    accounts: [],
    accountErrors: [],
    messages: [],
    onlineHistory: [],
    stats: {
        onlineBots: 0,
        totalBots: 0,
        chatRate: 0,
        aiCost: 0,
        uptimeSec: 0
    },
    lastAccountsText: "",
    setAccounts: (accounts) => set({ accounts }),
    setAccountErrors: (accountErrors) => set({ accountErrors }),
    setMessages: (messages) => set({ messages }),
    pushOnlinePoint: (online) => set((state) => ({
        onlineHistory: [...state.onlineHistory, { timestamp: Date.now(), online }].slice(-120)
    })),
    setStats: (stats) => set({ stats }),
    setLastAccountsText: (text) => set({ lastAccountsText: text })
}));
let ipcInitialized = false;
const initIpc = () => {
    if (ipcInitialized)
        return;
    if (!window.api)
        return;
    ipcInitialized = true;
    window.api.onAccountStatusChanged((payload) => {
        const account = payload;
        exports.useUIStore.setState((state) => {
            const existing = state.accounts.findIndex((acc) => acc.username === account.username);
            if (existing >= 0) {
                const updated = [...state.accounts];
                updated[existing] = account;
                return { accounts: updated };
            }
            return { accounts: [...state.accounts, account] };
        });
        if (account.status === "error") {
            react_hot_toast_1.default.error(`Ошибка аккаунта ${account.username}: ${account.lastError ?? "Неизвестная ошибка"}`);
        }
        if (account.status === "banned") {
            react_hot_toast_1.default.error(`Аккаунт ${account.username} забанен`);
        }
    });
    window.api.onChatMessage((payload) => {
        const message = payload;
        exports.useUIStore.setState((state) => ({
            messages: [...state.messages, message].slice(-200)
        }));
    });
    window.api.onStatsUpdate((payload) => {
        const stats = payload;
        exports.useUIStore.setState((state) => ({
            stats,
            onlineHistory: [...state.onlineHistory, { timestamp: Date.now(), online: stats.onlineBots }].slice(-120)
        }));
    });
};
exports.initIpc = initIpc;
