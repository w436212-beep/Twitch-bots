import React from "react";
import { StatsBar } from "./components/StatsBar";
import { ControlsPanel } from "./components/ControlsPanel";
import { AccountsTable } from "./components/AccountsTable";
import { OnlineChart } from "./components/OnlineChart";
import { ChatPreview } from "./components/ChatPreview";

export const Dashboard: React.FC = () => {
  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 p-4 font-sans flex flex-col gap-4">
      <StatsBar />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
        {/* Left Sidebar - Accounts Table */}
        <div className="md:col-span-3 flex flex-col">
          <AccountsTable />
        </div>

        {/* Center Panel - Controls and Chart */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <ControlsPanel />
          <OnlineChart />
        </div>

        {/* Right Sidebar - Chat Preview */}
        <div className="md:col-span-4 flex flex-col">
          <ChatPreview />
        </div>
      </div>
    </div>
  );
};
