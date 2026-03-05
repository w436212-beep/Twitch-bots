"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const SettingsModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [channel, setChannel] = (0, react_1.useState)("");
    const [cooldownMin, setCooldownMin] = (0, react_1.useState)(30);
    const [cooldownMax, setCooldownMax] = (0, react_1.useState)(120);
    const [chatRateMin, setChatRateMin] = (0, react_1.useState)(3);
    const [chatRateMax, setChatRateMax] = (0, react_1.useState)(5);
    const [floatingEnabled, setFloatingEnabled] = (0, react_1.useState)(true);
    const [floatingPercent, setFloatingPercent] = (0, react_1.useState)(15);
    const [viewbotEnabled, setViewbotEnabled] = (0, react_1.useState)(false);
    const [aiEnabled, setAiEnabled] = (0, react_1.useState)(false);
    const [aiApiKey, setAiApiKey] = (0, react_1.useState)("");
    const [aiChancePercent, setAiChancePercent] = (0, react_1.useState)(30);
    const [proxiesText, setProxiesText] = (0, react_1.useState)("");
    const [userAgentsText, setUserAgentsText] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        setLoading(true);
        window.api.getConfig().then((cfg) => {
            const config = cfg;
            setChannel(config.channel ?? "");
            setCooldownMin(config.messageCooldownMinSeconds ?? 30);
            setCooldownMax(config.messageCooldownMaxSeconds ?? 120);
            setChatRateMin(config.globalMessagesPerMinuteMin ?? 3);
            setChatRateMax(config.globalMessagesPerMinuteMax ?? 5);
            setFloatingEnabled(config.floatingEnabled ?? true);
            setFloatingPercent(config.floatingPercent ?? 15);
            setViewbotEnabled(config.viewbotEnabled ?? false);
            setAiEnabled(config.aiEnabled ?? false);
            setAiApiKey(config.aiApiKey ?? "");
            setAiChancePercent(Math.round((config.aiResponseChance ?? 0.3) * 100));
            setProxiesText((config.proxies ?? []).join("\n"));
            setUserAgentsText((config.userAgents ?? []).join("\n"));
        }).finally(() => setLoading(false));
    }, [isOpen]);
    if (!isOpen)
        return null;
    const handleSave = async () => {
        const proxies = proxiesText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        const userAgents = userAgentsText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        const payload = {
            channel: channel.trim(),
            messageCooldownMinSeconds: clamp(cooldownMin, 20, 180),
            messageCooldownMaxSeconds: clamp(cooldownMax, 20, 180),
            globalMessagesPerMinuteMin: clamp(chatRateMin, 1, 10),
            globalMessagesPerMinuteMax: clamp(chatRateMax, 1, 10),
            floatingEnabled,
            floatingPercent: clamp(floatingPercent, 10, 50),
            viewbotEnabled,
            aiEnabled,
            aiApiKey: aiApiKey.trim(),
            aiResponseChance: clamp(aiChancePercent, 10, 60) / 100,
            proxies,
            userAgents
        };
        await window.api.updateConfig(payload);
        onClose();
    };
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
        }, children: (0, jsx_runtime_1.jsxs)("div", { style: { background: "white", padding: 20, borderRadius: 8, width: 520 }, children: [(0, jsx_runtime_1.jsx)("h3", { children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" }), loading ? ((0, jsx_runtime_1.jsx)("div", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "Twitch \u043A\u0430\u043D\u0430\u043B (\u0431\u0435\u0437 #):" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: channel, onChange: (e) => setChannel(e.target.value), style: { width: "100%" } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsxs)("label", { children: ["\u041A\u0443\u043B\u0434\u0430\u0443\u043D \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 (\u0441\u0435\u043A): ", cooldownMin, " - ", cooldownMax] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "range", min: 20, max: 180, value: cooldownMin, onChange: (e) => setCooldownMin(Number(e.target.value)), style: { flex: 1 } }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: 20, max: 180, value: cooldownMax, onChange: (e) => setCooldownMax(Number(e.target.value)), style: { flex: 1 } })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsxs)("label", { children: ["\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0447\u0430\u0442\u0430 (\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u0432 \u043C\u0438\u043D\u0443\u0442\u0443): ", chatRateMin, " - ", chatRateMax] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "range", min: 1, max: 10, value: chatRateMin, onChange: (e) => setChatRateMin(Number(e.target.value)), style: { flex: 1 } }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: 1, max: 10, value: chatRateMax, onChange: (e) => setChatRateMax(Number(e.target.value)), style: { flex: 1 } })] })] }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 12 }, children: (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: floatingEnabled, onChange: (e) => setFloatingEnabled(e.target.checked) }), "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u043B\u0430\u0432\u0430\u044E\u0449\u0438\u0439 \u043E\u043D\u043B\u0430\u0439\u043D"] }) }), floatingEnabled && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsxs)("label", { children: ["\u041F\u0440\u043E\u0446\u0435\u043D\u0442 \u043E\u0444\u043B\u0430\u0439\u043D \u0431\u043E\u0442\u043E\u0432 (%): ", floatingPercent] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: 10, max: 50, value: floatingPercent, onChange: (e) => setFloatingPercent(Number(e.target.value)), style: { width: "100%" } })] })), (0, jsx_runtime_1.jsxs)("div", { style: { borderTop: "1px solid #eee", paddingTop: 12, marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 8, fontWeight: 600 }, children: "Viewbot \u0440\u0435\u0436\u0438\u043C" }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: viewbotEnabled, onChange: (e) => setViewbotEnabled(e.target.checked) }), "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C Viewbot (\u0431\u043E\u0442\u044B \u0431\u0443\u0434\u0443\u0442 \u0441\u0447\u0438\u0442\u0430\u0442\u044C\u0441\u044F \u0437\u0440\u0438\u0442\u0435\u043B\u044F\u043C\u0438)"] }), (0, jsx_runtime_1.jsx)("div", { style: {
                                        marginTop: 8,
                                        background: "#fff8db",
                                        border: "1px solid #f2d36b",
                                        borderRadius: 6,
                                        padding: 8,
                                        fontSize: 12
                                    }, children: "\u26A0\uFE0F \u0412\u043D\u0438\u043C\u0430\u043D\u0438\u0435: \u041A\u0430\u0436\u0434\u044B\u0439 \u0431\u043E\u0442 \u043E\u0442\u043A\u0440\u043E\u0435\u0442 headless \u0431\u0440\u0430\u0443\u0437\u0435\u0440. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 10-15 \u0431\u043E\u0442\u043E\u0432 \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E. \u041F\u043E\u0442\u0440\u0435\u0431\u043B\u0435\u043D\u0438\u0435: ~80-100 MB RAM \u043D\u0430 \u0431\u043E\u0442\u0430." }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: "#666", marginTop: 6 }, children: "\u2139\uFE0F \u0411\u043E\u0442\u044B \u0431\u0443\u0434\u0443\u0442 \u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0441\u0442\u0440\u0438\u043C \u0432 \u043C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u043C \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435 (160p, muted). \u041E\u043D\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0432 \u0441\u0447\u0435\u0442\u0447\u0438\u043A\u0435 \u0437\u0440\u0438\u0442\u0435\u043B\u0435\u0439 \u043D\u0430 Twitch." }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "\u041F\u0440\u043E\u043A\u0441\u0438 (1 \u0441\u0442\u0440\u043E\u043A\u0430 = 1 \u043F\u0440\u043E\u043A\u0441\u0438):" }), (0, jsx_runtime_1.jsx)("textarea", { value: proxiesText, onChange: (e) => setProxiesText(e.target.value), placeholder: "http://user:pass@ip:port\nhttp://ip:port", rows: 4, style: { width: "100%" } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "User-Agent (1 \u0441\u0442\u0440\u043E\u043A\u0430 = 1 UA):" }), (0, jsx_runtime_1.jsx)("textarea", { value: userAgentsText, onChange: (e) => setUserAgentsText(e.target.value), placeholder: "Mozilla/5.0 ...\nMozilla/5.0 ...", rows: 4, style: { width: "100%" } })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { borderTop: "1px solid #eee", paddingTop: 12, marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 8, fontWeight: 600 }, children: "AI \u0440\u0435\u0436\u0438\u043C" }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: aiEnabled, onChange: (e) => setAiEnabled(e.target.checked) }), "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C AI \u0440\u0435\u0436\u0438\u043C"] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "OpenAI API \u043A\u043B\u044E\u0447:" }), (0, jsx_runtime_1.jsx)("input", { type: "password", placeholder: "sk-proj-...", value: aiApiKey, onChange: (e) => setAiApiKey(e.target.value), style: { width: "100%" } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8 }, children: [(0, jsx_runtime_1.jsxs)("label", { children: ["\u0412\u0435\u0440\u043E\u044F\u0442\u043D\u043E\u0441\u0442\u044C \u043E\u0442\u0432\u0435\u0442\u0430 (%): ", aiChancePercent] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: 10, max: 60, value: aiChancePercent, onChange: (e) => setAiChancePercent(Number(e.target.value)), style: { width: "100%" } })] }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: "#666", marginTop: 6 }, children: "\u0411\u043E\u0442\u044B \u0431\u0443\u0434\u0443\u0442 \u043E\u0442\u0432\u0435\u0447\u0430\u0442\u044C \u0434\u0440\u0443\u0433 \u0434\u0440\u0443\u0433\u0443 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F AI. \u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F OpenAI API \u043A\u043B\u044E\u0447." })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSave, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] }))] }) }));
};
exports.SettingsModal = SettingsModal;
