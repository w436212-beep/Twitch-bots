import React, { useState } from "react";
import { useUIStore } from "../store";
import { SettingsModal } from "./SettingsModal";

export const ControlsPanel: React.FC = () => {
  const lastAccountsText = useUIStore((state) => state.lastAccountsText);
  const [broadcastText, setBroadcastText] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const startBots = async (): Promise<void> => {
    try {
      await window.api.startBots();
    } catch {
      // errors handled via IPC toasts later
    }
  };

  const stopBots = async (): Promise<void> => {
    try {
      await window.api.stopBots();
    } catch {
      // ignore for now
    }
  };

  const reloadAccounts = async (): Promise<void> => {
    try {
      await window.api.loadAccounts(lastAccountsText);
    } catch {
      // ignore for now
    }
  };

  const sendEmotion = async (): Promise<void> => {
    try {
      await window.api.sendEmotion();
    } catch {
      // ignore for now
    }
  };

  const sendGreeting = async (): Promise<void> => {
    try {
      await window.api.sendGreeting();
    } catch {
      // ignore for now
    }
  };

  const sendBroadcast = async (): Promise<void> => {
    const text = broadcastText.trim();
    if (!text) return;
    try {
      await window.api.broadcastMessage(text);
      setBroadcastText("");
    } catch {
      // ignore for now
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Управление</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={startBots}>▶ Старт</button>
        <button onClick={stopBots}>⏹ Стоп</button>
        <button onClick={sendEmotion}>😂 АХАХАХ</button>
        <button onClick={sendGreeting}>👋 Приветствие</button>
        <button onClick={reloadAccounts}>🔄 Reload Accounts</button>
        <button onClick={() => setShowSettings(true)}>⚙️ Настройки</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Отправить от всех:</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Введите сообщение..."
            value={broadcastText}
            onChange={(event) => setBroadcastText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void sendBroadcast();
              }
            }}
            style={{ flex: 1 }}
          />
          <button onClick={() => void sendBroadcast()}>📢 Отправить</button>
        </div>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
