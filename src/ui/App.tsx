import React, { useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Dashboard } from "./Dashboard";
import { initIpc } from "./store";

export const App: React.FC = () => {
  useEffect(() => {
    initIpc();
    if (!window.api) return;
    const unsubscribe = window.api.onSystemNotice((payload) => {
      const data = payload as { message?: string; type?: "error" | "success" };
      const message = data.message ?? "System notice";
      if (data.type === "success") {
        toast.success(message);
      } else {
        toast.error(message);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      <Toaster position="bottom-right" />
      <Dashboard />
    </>
  );
};

export default App;
