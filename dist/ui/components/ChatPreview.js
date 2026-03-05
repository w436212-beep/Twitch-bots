"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPreview = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const messageId = (msg) => `${msg.author}|${msg.text}|${msg.timestamp}`;
const ChatPreview = () => {
    const [messages, setMessages] = (0, react_1.useState)([]);
    const bottomRef = (0, react_1.useRef)(null);
    const messageIds = (0, react_1.useRef)(new Set());
    (0, react_1.useEffect)(() => {
        if (!window.api)
            return;
        const unsubscribe = window.api.onChatMessage((payload) => {
            const msg = payload;
            const id = messageId(msg);
            if (messageIds.current.has(id))
                return;
            setMessages((prev) => {
                const next = [...prev, msg];
                const trimmed = next.slice(-50);
                messageIds.current = new Set(trimmed.map(messageId));
                return trimmed;
            });
        });
        return () => {
            unsubscribe();
        };
    }, []);
    (0, react_1.useEffect)(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { border: "1px solid #ddd", borderRadius: 8, padding: 12, height: 600, overflow: "auto" }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 8 }, children: "\u0427\u0430\u0442" }), messages.map((m, idx) => {
                const time = new Date(m.timestamp).toLocaleTimeString();
                const background = m.isStreamer ? "#fff3cd" : m.isBot ? "#e0f2ff" : "transparent";
                return ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 6, background, padding: "2px 4px" }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: "#666" }, children: ["[", time, "] "] }), (0, jsx_runtime_1.jsxs)("strong", { children: [m.author, ": "] }), (0, jsx_runtime_1.jsx)("span", { children: m.text })] }, `${m.timestamp}-${idx}`));
            }), (0, jsx_runtime_1.jsx)("div", { ref: bottomRef })] }));
};
exports.ChatPreview = ChatPreview;
