import React, { useEffect, useRef, useState } from "react";
import { useUIStore } from "../store";

const formatUptime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export const StatsBar: React.FC = () => {
  const stats = useUIStore((state) => state.stats);
  const [uptime, setUptime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (stats.onlineBots > 0 && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setUptime((prev) => prev + 1);
      }, 1000);
    }

    if (stats.onlineBots === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stats.onlineBots]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div>Онлайн: {stats.onlineBots}/{stats.totalBots}</div>
      <div>Скорость: {stats.chatRate.toFixed(1)} msg/min</div>
      <div>AI Cost: ${stats.aiCost.toFixed(4)}</div>
      <div>Ingress: {stats.aiPromptTokens}</div>
      <div>Egress: {stats.aiCompletionTokens}</div>
      <div>
        Cache Hit Rate: {stats.aiRequests > 0 ? ((stats.aiCacheHits / stats.aiRequests) * 100).toFixed(1) : "0.0"}%
      </div>
      <div>RAM: {stats.ramUsageMb} MB</div>
      <div>Free RAM: {stats.systemFreeGb.toFixed(2)} GB</div>
      <div>CPU Load(1m): {stats.cpuLoad1m.toFixed(2)}</div>
      <div>Uptime: {formatUptime(uptime)}</div>
    </div>
  );
};
