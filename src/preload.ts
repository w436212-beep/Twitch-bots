import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  loadAccounts: (text: string) => ipcRenderer.invoke("loadAccounts", text),
  startBots: () => ipcRenderer.invoke("startBots"),
  stopBots: () => ipcRenderer.invoke("stopBots"),
  sendEmotion: () => ipcRenderer.invoke("sendEmotion"),
  broadcastMessage: (text: string) => ipcRenderer.invoke("bots:broadcast", text),
  sendGreeting: () => ipcRenderer.invoke("bots:greeting"),
  getConfig: () => ipcRenderer.invoke("config:get"),
  updateConfig: (config: unknown) => ipcRenderer.invoke("config:update", config),
  onAccountStatusChanged: (listener: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload);
    ipcRenderer.on("account:statusChanged", handler);
    return () => ipcRenderer.removeListener("account:statusChanged", handler);
  },
  onChatMessage: (listener: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload);
    ipcRenderer.on("chat:newMessage", handler);
    return () => ipcRenderer.removeListener("chat:newMessage", handler);
  },
  onStatsUpdate: (listener: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload);
    ipcRenderer.on("stats:update", handler);
    return () => ipcRenderer.removeListener("stats:update", handler);
  },
  onAiCostIncrement: (listener: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload);
    ipcRenderer.on("ai:cost-increment", handler);
    return () => ipcRenderer.removeListener("ai:cost-increment", handler);
  },
  onAiUsageUpdate: (listener: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload);
    ipcRenderer.on("ai:usage-update", handler);
    return () => ipcRenderer.removeListener("ai:usage-update", handler);
  },
  onSystemNotice: (listener: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload);
    ipcRenderer.on("system:notice", handler);
    return () => ipcRenderer.removeListener("system:notice", handler);
  }
});
