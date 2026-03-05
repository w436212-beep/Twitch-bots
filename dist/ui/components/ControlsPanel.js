"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlsPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const store_1 = require("../store");
const SettingsModal_1 = require("./SettingsModal");
const ControlsPanel = () => {
    const lastAccountsText = (0, store_1.useUIStore)((state) => state.lastAccountsText);
    const [broadcastText, setBroadcastText] = (0, react_1.useState)("");
    const [showSettings, setShowSettings] = (0, react_1.useState)(false);
    const startBots = async () => {
        try {
            await window.api.startBots();
        }
        catch {
            // errors handled via IPC toasts later
        }
    };
    const stopBots = async () => {
        try {
            await window.api.stopBots();
        }
        catch {
            // ignore for now
        }
    };
    const reloadAccounts = async () => {
        try {
            await window.api.loadAccounts(lastAccountsText);
        }
        catch {
            // ignore for now
        }
    };
    const sendEmotion = async () => {
        try {
            await window.api.sendEmotion();
        }
        catch {
            // ignore for now
        }
    };
    const sendGreeting = async () => {
        try {
            await window.api.sendGreeting();
        }
        catch {
            // ignore for now
        }
    };
    const sendBroadcast = async () => {
        const text = broadcastText.trim();
        if (!text)
            return;
        try {
            await window.api.broadcastMessage(text);
            setBroadcastText("");
        }
        catch {
            // ignore for now
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { border: "1px solid #ddd", borderRadius: 8, padding: 12 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 8 }, children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: startBots, children: "\u25B6 \u0421\u0442\u0430\u0440\u0442" }), (0, jsx_runtime_1.jsx)("button", { onClick: stopBots, children: "\u23F9 \u0421\u0442\u043E\u043F" }), (0, jsx_runtime_1.jsx)("button", { onClick: sendEmotion, children: "\uD83D\uDE02 \u0410\u0425\u0410\u0425\u0410\u0425" }), (0, jsx_runtime_1.jsx)("button", { onClick: sendGreeting, children: "\uD83D\uDC4B \u041F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435" }), (0, jsx_runtime_1.jsx)("button", { onClick: reloadAccounts, children: "\uD83D\uDD04 Reload Accounts" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setShowSettings(true), children: "\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 6 }, children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0442 \u0432\u0441\u0435\u0445:" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435...", value: broadcastText, onChange: (event) => setBroadcastText(event.target.value), onKeyDown: (event) => {
                                    if (event.key === "Enter") {
                                        void sendBroadcast();
                                    }
                                }, style: { flex: 1 } }), (0, jsx_runtime_1.jsx)("button", { onClick: () => void sendBroadcast(), children: "\uD83D\uDCE2 \u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" })] })] }), (0, jsx_runtime_1.jsx)(SettingsModal_1.SettingsModal, { isOpen: showSettings, onClose: () => setShowSettings(false) })] }));
};
exports.ControlsPanel = ControlsPanel;
