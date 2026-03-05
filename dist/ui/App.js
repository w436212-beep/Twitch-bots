"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_hot_toast_1 = require("react-hot-toast");
const Dashboard_1 = require("./Dashboard");
const store_1 = require("./store");
const App = () => {
    (0, react_1.useEffect)(() => {
        (0, store_1.initIpc)();
    }, []);
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(react_hot_toast_1.Toaster, { position: "top-right" }), (0, jsx_runtime_1.jsx)(Dashboard_1.Dashboard, {})] }));
};
exports.App = App;
exports.default = exports.App;
