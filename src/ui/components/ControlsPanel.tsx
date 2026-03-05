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
    <div className="border border-slate-700 bg-slate-800 rounded-lg p-4 shadow-md flex flex-col gap-4 text-slate-200">
      <div className="font-semibold text-slate-100 flex items-center justify-between">
        <span>Управление</span>
        <button
          onClick={() => setShowSettings(true)}
          className="text-slate-400 hover:text-white transition-colors"
          title="Настройки"
        >
          ⚙️
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={startBots}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors shadow-sm col-span-2 md:col-span-1"
        >
          ▶ Старт
        </button>
        <button
          onClick={stopBots}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors shadow-sm col-span-2 md:col-span-1"
        >
          ⏹ Стоп
        </button>
        <button
          onClick={sendEmotion}
          className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 py-2 px-4 rounded transition-colors text-sm"
        >
          😂 АХАХАХ
        </button>
        <button
          onClick={sendGreeting}
          className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 py-2 px-4 rounded transition-colors text-sm"
        >
          👋 Приветствие
        </button>
        <button
          onClick={reloadAccounts}
          className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 py-2 px-4 rounded transition-colors text-sm col-span-2"
        >
          🔄 Reload Accounts
        </button>
      </div>

      <div className="mt-2 pt-4 border-t border-slate-700">
        <div className="font-medium text-sm text-slate-300 mb-2">Отправить от всех:</div>
        <div className="flex gap-2">
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
            className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500"
          />
          <button
            onClick={() => void sendBroadcast()}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium transition-colors whitespace-nowrap"
          >
            📢 Отправить
          </button>
        </div>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
