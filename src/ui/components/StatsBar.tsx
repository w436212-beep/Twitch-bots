import React, { useEffect, useRef, useState } from "react";
import { useUIStore } from "../store";

const formatUptime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string | number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-md flex flex-col justify-center">
    <div className="text-sm text-slate-400 mb-1">{title}</div>
    <div className="text-2xl font-bold text-slate-100">{value}</div>
    {subValue !== undefined && <div className="text-xs text-slate-500 mt-1">{subValue}</div>}
  </div>
);

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

  const cacheHitRate = stats.aiRequests > 0 ? ((stats.aiCacheHits / stats.aiRequests) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <MetricCard
        title="Онлайн / Всего"
        value={`${stats.onlineBots} / ${stats.totalBots}`}
        subValue={`Скорость: ${stats.chatRate.toFixed(1)} msg/min`}
      />
      <MetricCard
        title="AI Cost"
        value={`$${stats.aiCost.toFixed(4)}`}
        subValue={`Cache Hit: ${cacheHitRate}%`}
      />
      <MetricCard
        title="AI Tokens"
        value={`${stats.aiPromptTokens}`}
        subValue={`Egress: ${stats.aiCompletionTokens}`}
      />
      <MetricCard
        title="System (RAM)"
        value={`${stats.ramUsageMb} MB`}
        subValue={`Free: ${stats.systemFreeGb.toFixed(2)} GB | CPU(1m): ${stats.cpuLoad1m.toFixed(2)}`}
      />
      <MetricCard
        title="Uptime"
        value={formatUptime(uptime)}
      />
    </div>
  );
};
