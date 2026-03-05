"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineChart = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_chartjs_2_1 = require("react-chartjs-2");
const chart_js_1 = require("chart.js");
const store_1 = require("../store");
chart_js_1.Chart.register(chart_js_1.LineElement, chart_js_1.PointElement, chart_js_1.LinearScale, chart_js_1.CategoryScale, chart_js_1.Tooltip, chart_js_1.Legend);
const OnlineChart = () => {
    const history = (0, store_1.useUIStore)((state) => state.onlineHistory);
    const chartData = (0, react_1.useMemo)(() => {
        const labels = history.map((h) => new Date(h.timestamp).toLocaleTimeString());
        const data = history.map((h) => h.online);
        return {
            labels,
            datasets: [
                {
                    label: "Онлайн",
                    data,
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37, 99, 235, 0.2)",
                    tension: 0.2
                }
            ]
        };
    }, [history]);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { border: "1px solid #ddd", borderRadius: 8, padding: 12, height: 300 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 8 }, children: "\u041E\u043D\u043B\u0430\u0439\u043D" }), (0, jsx_runtime_1.jsx)(react_chartjs_2_1.Line, { data: chartData, options: { responsive: true, maintainAspectRatio: false } })] }));
};
exports.OnlineChart = OnlineChart;
