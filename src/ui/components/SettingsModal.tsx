import React, { useEffect, useState } from "react";
import { AppConfig } from "../../utils/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState("");
  const [cooldownMin, setCooldownMin] = useState(30);
  const [cooldownMax, setCooldownMax] = useState(120);
  const [chatRateMin, setChatRateMin] = useState(3);
  const [chatRateMax, setChatRateMax] = useState(5);
  const [floatingEnabled, setFloatingEnabled] = useState(true);
  const [floatingPercent, setFloatingPercent] = useState(15);
  const [viewbotEnabled, setViewbotEnabled] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiChancePercent, setAiChancePercent] = useState(30);
  const [proxiesText, setProxiesText] = useState("");
  const [userAgentsText, setUserAgentsText] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    window.api.getConfig().then((cfg) => {
      const config = cfg as AppConfig;
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

  if (!isOpen) return null;

  const handleSave = async (): Promise<void> => {
    const proxies = proxiesText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const userAgents = userAgentsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const payload: Partial<AppConfig> = {
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

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 text-slate-200">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-xl font-bold mb-4 text-slate-100 flex items-center gap-2">
          <span>⚙️</span> Настройки
        </h3>

        {loading ? (
          <div className="py-8 text-center text-slate-400">Загрузка...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Twitch канал (без #):</label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Имя канала"
              />
            </div>

            <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-700/50">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Кулдаун сообщений (сек): <span className="text-blue-400 font-bold">{cooldownMin}</span> - <span className="text-blue-400 font-bold">{cooldownMax}</span>
              </label>
              <div className="flex gap-4">
                <input
                  type="range"
                  min={20}
                  max={180}
                  value={cooldownMin}
                  onChange={(e) => setCooldownMin(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <input
                  type="range"
                  min={20}
                  max={180}
                  value={cooldownMax}
                  onChange={(e) => setCooldownMax(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-700/50">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Скорость чата (сообщ/мин): <span className="text-blue-400 font-bold">{chatRateMin}</span> - <span className="text-blue-400 font-bold">{chatRateMax}</span>
              </label>
              <div className="flex gap-4">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={chatRateMin}
                  onChange={(e) => setChatRateMin(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={chatRateMax}
                  onChange={(e) => setChatRateMax(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <div className="border border-slate-700 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={floatingEnabled}
                  onChange={(e) => setFloatingEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm font-medium text-slate-300">Включить плавающий онлайн</span>
              </label>

              {floatingEnabled && (
                <div className="mt-3 pl-6">
                  <label className="block text-xs text-slate-400 mb-1">
                    Процент офлайн ботов: <span className="text-blue-400">{floatingPercent}%</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    value={floatingPercent}
                    onChange={(e) => setFloatingPercent(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-700">
              <div className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="bg-purple-500/20 text-purple-400 p-1 rounded">👁️</span> Viewbot режим
              </div>

              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={viewbotEnabled}
                  onChange={(e) => setViewbotEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm font-medium text-slate-300">Считать ботов зрителями</span>
              </label>

              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-xs text-yellow-200/80 mb-3 leading-relaxed">
                <span className="text-yellow-400 font-bold">⚠️ Внимание:</span> Каждый бот откроет headless браузер.
                Рекомендуется максимум 10-15 ботов одновременно. Потребление: ~80-100 MB RAM на бота.
                <br/><span className="mt-1 block text-slate-400 italic">ℹ️ Боты будут смотреть стрим в 160p, muted.</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Прокси (1 строка = 1 прокси):</label>
                  <textarea
                    value={proxiesText}
                    onChange={(e) => setProxiesText(e.target.value)}
                    placeholder={"http://user:pass@ip:port\nhttp://ip:port"}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-600 rounded text-sm p-2 text-slate-300 focus:outline-none focus:border-blue-500 resize-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">User-Agent (1 строка = 1 UA):</label>
                  <textarea
                    value={userAgentsText}
                    onChange={(e) => setUserAgentsText(e.target.value)}
                    placeholder={"Mozilla/5.0 ...\nMozilla/5.0 ..."}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-600 rounded text-sm p-2 text-slate-300 focus:outline-none focus:border-blue-500 resize-none font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-700">
              <div className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 p-1 rounded">🤖</span> AI режим
              </div>

              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm font-medium text-slate-300">Включить AI генерацию ответов</span>
              </label>

              <div className="space-y-3 pl-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">OpenAI API ключ:</label>
                  <input
                    type="password"
                    placeholder="sk-proj-..."
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Вероятность ответа: <span className="text-blue-400 font-bold">{aiChancePercent}%</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    value={aiChancePercent}
                    onChange={(e) => setAiChancePercent(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
              >
                Сохранить настройки
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
