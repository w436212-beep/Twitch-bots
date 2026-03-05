import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from "chart.js";
import { useUIStore } from "../store";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export const OnlineChart: React.FC = () => {
  const history = useUIStore((state) => state.onlineHistory);

  const chartData = useMemo(() => {
    const labels = history.map((h) => new Date(h.timestamp).toLocaleTimeString());
    const data = history.map((h) => h.online);
    return {
      labels,
      datasets: [
        {
          label: "Онлайн",
          data,
          borderColor: "#3b82f6", // blue-500
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          tension: 0.2,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#1e293b", // slate-800
        }
      ]
    };
  }, [history]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#94a3b8" // slate-400
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8" }, // slate-400
        grid: { color: "#334155" } // slate-700
      },
      y: {
        ticks: { color: "#94a3b8" }, // slate-400
        grid: { color: "#334155" }, // slate-700
        beginAtZero: true
      }
    }
  };

  return (
    <div className="border border-slate-700 bg-slate-800 rounded-lg p-3 h-[300px] shadow-md flex flex-col">
      <div className="font-semibold text-slate-200 mb-2">Онлайн (последние 60 точек)</div>
      <div className="flex-1 relative min-h-0">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
