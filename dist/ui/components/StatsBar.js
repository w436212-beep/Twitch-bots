"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsBar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const store_1 = require("../store");
const formatUptime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
const StatsBar = () => {
    const stats = (0, store_1.useUIStore)((state) => state.stats);
    const [uptime, setUptime] = (0, react_1.useState)(0);
    const intervalRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (stats.onlineBots > 0 && !intervalRef.current) {
            intervalRef.current = setInterval(() => {
                setUptime((prev) => prev + 1);
            }, 1000);
        }
        if (stats.onlineBots === 0 && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [stats.onlineBots]);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "flex", gap: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: ["\u041E\u043D\u043B\u0430\u0439\u043D: ", stats.onlineBots, "/", stats.totalBots] }), (0, jsx_runtime_1.jsxs)("div", { children: ["\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C: ", stats.chatRate.toFixed(1), " msg/min"] }), (0, jsx_runtime_1.jsxs)("div", { children: ["AI: $", stats.aiCost.toFixed(2)] }), (0, jsx_runtime_1.jsxs)("div", { children: ["Uptime: ", formatUptime(uptime)] })] }));
};
exports.StatsBar = StatsBar;
