import React, { useEffect, useRef, useState } from "react";
import { Message } from "../../utils/types";

const messageId = (msg: Message): string => `${msg.author}|${msg.text}|${msg.timestamp}`;

export const ChatPreview: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!window.api) return;
    const unsubscribe = window.api.onChatMessage((payload) => {
      const msg = payload as Message;
      const id = messageId(msg);
      if (messageIds.current.has(id)) return;
      setMessages((prev) => {
        const next = [...prev, msg];
        const trimmed = next.slice(-50);
        messageIds.current = new Set(trimmed.map(messageId));
        return trimmed;
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="border border-slate-700 bg-slate-800 rounded-lg p-3 flex flex-col h-full shadow-md">
      <div className="font-semibold text-slate-100 mb-2 border-b border-slate-700 pb-2">Живой чат</div>
      <div className="flex-1 overflow-auto custom-scrollbar pr-2 space-y-1">
        {messages.map((m, idx) => {
          const time = new Date(m.timestamp).toLocaleTimeString();

          let bgClass = "bg-transparent hover:bg-slate-700/30";
          let borderClass = "border-transparent";

          if (m.isStreamer) {
            bgClass = "bg-amber-900/20";
            borderClass = "border-amber-700/30";
          } else if (m.isBot) {
            bgClass = "bg-blue-900/20";
            borderClass = "border-blue-800/30";
          }

          return (
            <div
              key={`${m.timestamp}-${idx}`}
              className={`px-2 py-1.5 rounded border ${bgClass} ${borderClass} transition-colors text-sm break-words leading-relaxed`}
            >
              <span className="text-slate-500 text-xs font-mono mr-2">[{time}]</span>
              <strong className={`${m.isStreamer ? 'text-amber-400' : m.isBot ? 'text-blue-400' : 'text-slate-300'} font-semibold mr-1`}>
                {m.author}:
              </strong>
              <span className="text-slate-200">{m.text}</span>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center text-slate-500 italic mt-4 text-sm">Нет сообщений</div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
};
