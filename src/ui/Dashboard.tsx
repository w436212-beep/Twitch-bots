import React from "react";
import { StatsBar } from "./components/StatsBar";
import { ControlsPanel } from "./components/ControlsPanel";
import { AccountsTable } from "./components/AccountsTable";
import { OnlineChart } from "./components/OnlineChart";
import { ChatPreview } from "./components/ChatPreview";

export const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: 16, fontFamily: "Segoe UI, sans-serif" }}>
      <StatsBar />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 16, marginTop: 16 }}>
        <AccountsTable />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ControlsPanel />
          <OnlineChart />
        </div>
        <ChatPreview />
      </div>
    </div>
  );
};
