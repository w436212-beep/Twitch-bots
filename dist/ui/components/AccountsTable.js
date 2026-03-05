"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsTable = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const store_1 = require("../store");
const AccountsTable = () => {
    const accounts = (0, store_1.useUIStore)((state) => state.accounts);
    const accountErrors = (0, store_1.useUIStore)((state) => state.accountErrors);
    const setAccounts = (0, store_1.useUIStore)((state) => state.setAccounts);
    const setAccountErrors = (0, store_1.useUIStore)((state) => state.setAccountErrors);
    const setLastAccountsText = (0, store_1.useUIStore)((state) => state.setLastAccountsText);
    const [rawInput, setRawInput] = (0, react_1.useState)("");
    const [filterStatus, setFilterStatus] = (0, react_1.useState)("all");
    const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
    const stats = (0, react_1.useMemo)(() => {
        return {
            loaded: accounts.length + accountErrors.length,
            valid: accounts.length,
            errors: accountErrors.length
        };
    }, [accounts.length, accountErrors.length]);
    const filteredAccounts = (0, react_1.useMemo)(() => {
        let list = accounts;
        if (filterStatus !== "all") {
            list = list.filter((acc) => acc.status === filterStatus);
        }
        const query = searchQuery.trim().toLowerCase();
        if (query) {
            list = list.filter((acc) => acc.username.toLowerCase().includes(query));
        }
        return list;
    }, [accounts, filterStatus, searchQuery]);
    const applyLoaded = (0, react_1.useCallback)((result) => {
        if (result.accounts)
            setAccounts(result.accounts);
        if (result.errors)
            setAccountErrors(result.errors);
    }, [setAccounts, setAccountErrors]);
    const loadAccounts = (0, react_1.useCallback)(async (text) => {
        setLastAccountsText(text);
        try {
            const result = (await window.api.loadAccounts(text));
            applyLoaded(result);
        }
        catch {
            // ignore for now
        }
    }, [applyLoaded, setLastAccountsText]);
    const handleFile = (0, react_1.useCallback)((file) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === "string" ? reader.result : "";
            void loadAccounts(text);
        };
        reader.readAsText(file);
    }, [loadAccounts]);
    const handleDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file)
            handleFile(file);
    };
    const exportCsv = () => {
        if (accountErrors.length === 0)
            return;
        const header = "line,raw,reason";
        const rows = accountErrors.map((err) => [err.line, JSON.stringify(err.raw), JSON.stringify(err.reason)].join(","));
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "account_errors.csv";
        link.click();
        URL.revokeObjectURL(url);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { border: "1px solid #ddd", borderRadius: 8, padding: 12, height: 600, overflow: "auto" }, onDragOver: (event) => event.preventDefault(), onDrop: handleDrop, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 8 }, children: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442\u044B" }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 8, fontSize: 12 }, children: ["\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E: ", stats.loaded, " | \u0412\u0430\u043B\u0438\u0434\u043D\u044B\u0445: ", stats.valid, " | \u041E\u0448\u0438\u0431\u043E\u043A: ", stats.errors] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 8, marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setFilterStatus("all"), children: "\u0412\u0441\u0435" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setFilterStatus("online"), children: "\u041E\u043D\u043B\u0430\u0439\u043D" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setFilterStatus("error"), children: "\u041E\u0448\u0438\u0431\u043A\u0438" }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E username...", value: searchQuery, onChange: (event) => setSearchQuery(event.target.value), style: { flex: 1 } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 8, marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "file", accept: ".txt", onChange: (event) => {
                            const file = event.target.files?.[0];
                            if (file)
                                handleFile(file);
                        } }), (0, jsx_runtime_1.jsx)("button", { onClick: exportCsv, disabled: accountErrors.length === 0, children: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 CSV" })] }), (0, jsx_runtime_1.jsx)("textarea", { placeholder: "\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u044B \u043F\u043E\u0441\u0442\u0440\u043E\u0447\u043D\u043E", value: rawInput, onChange: (event) => setRawInput(event.target.value), onBlur: () => void loadAccounts(rawInput), style: { width: "100%", height: 80, marginBottom: 8 } }), (0, jsx_runtime_1.jsxs)("table", { style: { width: "100%", fontSize: 12 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { align: "left", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), (0, jsx_runtime_1.jsx)("th", { align: "left", children: "Username" }), (0, jsx_runtime_1.jsx)("th", { align: "left", children: "Uptime" }), (0, jsx_runtime_1.jsx)("th", { align: "left", children: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: filteredAccounts.map((acc) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: acc.status === "online" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Online", acc.isViewing && ((0, jsx_runtime_1.jsx)("span", { style: { marginLeft: 4 }, title: "Viewing stream", children: "\uD83D\uDC41\uFE0F" }))] })) : (acc.status) }), (0, jsx_runtime_1.jsx)("td", { children: acc.username }), (0, jsx_runtime_1.jsx)("td", { children: acc.connectedAt ? Math.floor((Date.now() - acc.connectedAt) / 1000) + "s" : "-" }), (0, jsx_runtime_1.jsx)("td", { children: acc.messagesSent })] }, acc.username))) })] })] }));
};
exports.AccountsTable = AccountsTable;
