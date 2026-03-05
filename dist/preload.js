"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("api", {
    loadAccounts: (text) => electron_1.ipcRenderer.invoke("loadAccounts", text),
    startBots: () => electron_1.ipcRenderer.invoke("startBots"),
    stopBots: () => electron_1.ipcRenderer.invoke("stopBots"),
    sendEmotion: () => electron_1.ipcRenderer.invoke("sendEmotion"),
    broadcastMessage: (text) => electron_1.ipcRenderer.invoke("bots:broadcast", text),
    sendGreeting: () => electron_1.ipcRenderer.invoke("bots:greeting"),
    getConfig: () => electron_1.ipcRenderer.invoke("config:get"),
    updateConfig: (config) => electron_1.ipcRenderer.invoke("config:update", config),
    onAccountStatusChanged: (listener) => {
        const handler = (_event, payload) => listener(payload);
        electron_1.ipcRenderer.on("account:statusChanged", handler);
        return () => electron_1.ipcRenderer.removeListener("account:statusChanged", handler);
    },
    onChatMessage: (listener) => {
        const handler = (_event, payload) => listener(payload);
        electron_1.ipcRenderer.on("chat:newMessage", handler);
        return () => electron_1.ipcRenderer.removeListener("chat:newMessage", handler);
    },
    onStatsUpdate: (listener) => {
        const handler = (_event, payload) => listener(payload);
        electron_1.ipcRenderer.on("stats:update", handler);
        return () => electron_1.ipcRenderer.removeListener("stats:update", handler);
    }
});
