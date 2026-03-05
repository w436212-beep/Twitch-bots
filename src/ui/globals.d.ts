export {};

declare global {
  interface Window {
    api: {
      loadAccounts: (text: string) => Promise<unknown>;
      startBots: () => Promise<unknown>;
      stopBots: () => Promise<unknown>;
      sendEmotion: () => Promise<unknown>;
      broadcastMessage: (text: string) => Promise<unknown>;
      sendGreeting: () => Promise<unknown>;
      getConfig: () => Promise<unknown>;
      updateConfig: (config: unknown) => Promise<unknown>;
      onAccountStatusChanged: (listener: (data: unknown) => void) => () => void;
      onChatMessage: (listener: (data: unknown) => void) => () => void;
      onStatsUpdate: (listener: (data: unknown) => void) => () => void;
      onAiCostIncrement: (listener: (data: unknown) => void) => () => void;
      onAiUsageUpdate: (listener: (data: unknown) => void) => () => void;
      onSystemNotice: (listener: (data: unknown) => void) => () => void;
    };
  }
}
