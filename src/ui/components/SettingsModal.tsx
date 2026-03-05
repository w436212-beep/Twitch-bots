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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div style={{ background: "white", padding: 20, borderRadius: 8, width: 520 }}>
        <h3>Настройки</h3>
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label>Twitch канал (без #):</label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Кулдаун сообщений (сек): {cooldownMin} - {cooldownMax}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="range"
                  min={20}
                  max={180}
                  value={cooldownMin}
                  onChange={(e) => setCooldownMin(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="range"
                  min={20}
                  max={180}
                  value={cooldownMax}
                  onChange={(e) => setCooldownMax(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Скорость чата (сообщений в минуту): {chatRateMin} - {chatRateMax}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={chatRateMin}
                  onChange={(e) => setChatRateMin(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={chatRateMax}
                  onChange={(e) => setChatRateMax(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>
                <input
                  type="checkbox"
                  checked={floatingEnabled}
                  onChange={(e) => setFloatingEnabled(e.target.checked)}
                />
                Включить плавающий онлайн
              </label>
            </div>

            {floatingEnabled && (
              <div style={{ marginBottom: 12 }}>
                <label>Процент офлайн ботов (%): {floatingPercent}</label>
                <input
                  type="range"
                  min={10}
                  max={50}
                  value={floatingPercent}
                  onChange={(e) => setFloatingPercent(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            )}

            <div style={{ borderTop: "1px solid #eee", paddingTop: 12, marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Viewbot режим</div>
              <label>
                <input
                  type="checkbox"
                  checked={viewbotEnabled}
                  onChange={(e) => setViewbotEnabled(e.target.checked)}
                />
                Включить Viewbot (боты будут считаться зрителями)
              </label>
              <div
                style={{
                  marginTop: 8,
                  background: "#fff8db",
                  border: "1px solid #f2d36b",
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 12
                }}
              >
                ⚠️ Внимание: Каждый бот откроет headless браузер. Рекомендуется максимум 10-15 ботов одновременно.
                Потребление: ~80-100 MB RAM на бота.
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                ℹ️ Боты будут смотреть стрим в минимальном качестве (160p, muted). Они появятся в счетчике зрителей на
                Twitch.
              </div>
              <div style={{ marginTop: 12 }}>
                <label>Прокси (1 строка = 1 прокси):</label>
                <textarea
                  value={proxiesText}
                  onChange={(e) => setProxiesText(e.target.value)}
                  placeholder={"http://user:pass@ip:port\nhttp://ip:port"}
                  rows={4}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <label>User-Agent (1 строка = 1 UA):</label>
                <textarea
                  value={userAgentsText}
                  onChange={(e) => setUserAgentsText(e.target.value)}
                  placeholder={"Mozilla/5.0 ...\nMozilla/5.0 ..."}
                  rows={4}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: 12, marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>AI режим</div>
              <label>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                />
                Включить AI режим
              </label>
              <div style={{ marginTop: 8 }}>
                <label>OpenAI API ключ:</label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <label>Вероятность ответа (%): {aiChancePercent}</label>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={aiChancePercent}
                  onChange={(e) => setAiChancePercent(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                Боты будут отвечать друг другу используя AI. Требуется OpenAI API ключ.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={onClose}>Отмена</button>
              <button onClick={handleSave}>Сохранить</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
