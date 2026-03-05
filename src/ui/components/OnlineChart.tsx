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
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.2)",
          tension: 0.2
        }
      ]
    };
  }, [history]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, height: 300 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Онлайн</div>
      <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
    </div>
  );
};
