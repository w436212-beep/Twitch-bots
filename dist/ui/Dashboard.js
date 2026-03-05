"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dashboard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const StatsBar_1 = require("./components/StatsBar");
const ControlsPanel_1 = require("./components/ControlsPanel");
const AccountsTable_1 = require("./components/AccountsTable");
const OnlineChart_1 = require("./components/OnlineChart");
const ChatPreview_1 = require("./components/ChatPreview");
const Dashboard = () => {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 16, fontFamily: "Segoe UI, sans-serif" }, children: [(0, jsx_runtime_1.jsx)(StatsBar_1.StatsBar, {}), (0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 16, marginTop: 16 }, children: [(0, jsx_runtime_1.jsx)(AccountsTable_1.AccountsTable, {}), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [(0, jsx_runtime_1.jsx)(ControlsPanel_1.ControlsPanel, {}), (0, jsx_runtime_1.jsx)(OnlineChart_1.OnlineChart, {})] }), (0, jsx_runtime_1.jsx)(ChatPreview_1.ChatPreview, {})] })] }));
};
exports.Dashboard = Dashboard;
