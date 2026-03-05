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
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, height: 600, overflow: "auto" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Чат</div>
      {messages.map((m, idx) => {
        const time = new Date(m.timestamp).toLocaleTimeString();
        const background = m.isStreamer ? "#fff3cd" : m.isBot ? "#e0f2ff" : "transparent";
        return (
          <div key={`${m.timestamp}-${idx}`} style={{ marginBottom: 6, background, padding: "2px 4px" }}>
            <span style={{ color: "#666" }}>[{time}] </span>
            <strong>{m.author}: </strong>
            <span>{m.text}</span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
