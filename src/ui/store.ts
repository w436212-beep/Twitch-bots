import { create } from "zustand";
import toast from "react-hot-toast";
import { Account, Message } from "../utils/types";

interface StatsState {
  onlineBots: number;
  totalBots: number;
  chatRate: number;
  aiCost: number;
  aiPromptTokens: number;
  aiCompletionTokens: number;
  aiRequests: number;
  aiCacheHits: number;
  ramUsageMb: number;
  systemFreeGb: number;
  cpuLoad1m: number;
  uptimeSec: number;
}

interface UIState {
  accounts: Account[];
  accountErrors: Array<{ line: number; raw: string; reason: string }>;
  messages: Message[];
  onlineHistory: Array<{ timestamp: number; online: number }>;
  stats: StatsState;
  lastAccountsText: string;
  setAccounts: (accounts: Account[]) => void;
  setAccountErrors: (errors: Array<{ line: number; raw: string; reason: string }>) => void;
  setMessages: (messages: Message[]) => void;
  pushOnlinePoint: (online: number) => void;
  setStats: (stats: StatsState) => void;
  setLastAccountsText: (text: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  accounts: [],
  accountErrors: [],
  messages: [],
  onlineHistory: [],
  stats: {
    onlineBots: 0,
    totalBots: 0,
    chatRate: 0,
    aiCost: 0,
    aiPromptTokens: 0,
    aiCompletionTokens: 0,
    aiRequests: 0,
    aiCacheHits: 0,
    ramUsageMb: 0,
    systemFreeGb: 0,
    cpuLoad1m: 0,
    uptimeSec: 0
  },
  lastAccountsText: "",
  setAccounts: (accounts) => set({ accounts }),
  setAccountErrors: (accountErrors) => set({ accountErrors }),
  setMessages: (messages) => set({ messages }),
  pushOnlinePoint: (online) =>
    set((state) => ({
      onlineHistory: [...state.onlineHistory, { timestamp: Date.now(), online }].slice(-60)
    })),
  setStats: (stats) => set({ stats }),
  setLastAccountsText: (text) => set({ lastAccountsText: text })
}));

let ipcInitialized = false;

export const initIpc = (): void => {
  if (ipcInitialized) return;
  if (!window.api) return;
  ipcInitialized = true;

  window.api.onAccountStatusChanged((payload) => {
    const account = payload as Account;
    useUIStore.setState((state) => {
      const existing = state.accounts.findIndex((acc) => acc.username === account.username);
      if (existing >= 0) {
        const updated = [...state.accounts];
        updated[existing] = account;
        return { accounts: updated };
      }
      return { accounts: [...state.accounts, account] };
    });

    if (account.status === "error") {
      toast.error(`Ошибка аккаунта ${account.username}: ${account.lastError ?? "Неизвестная ошибка"}`);
    }
    if (account.status === "banned") {
      toast.error(`Аккаунт ${account.username} забанен`);
    }
  });

  window.api.onChatMessage((payload) => {
    const message = payload as Message;
    useUIStore.setState((state) => ({
      messages: [...state.messages, message].slice(-200)
    }));
  });

  window.api.onStatsUpdate((payload) => {
    const stats = payload as StatsState;
    useUIStore.setState((state) => ({
      stats,
      onlineHistory: [...state.onlineHistory, { timestamp: Date.now(), online: stats.onlineBots }].slice(-60)
    }));
  });

  window.api.onAiCostIncrement((payload) => {
    const data = payload as { delta?: number; total?: number };
    useUIStore.setState((state) => {
      const delta = typeof data?.delta === "number" ? data.delta : 0;
      const total = typeof data?.total === "number" ? data.total : state.stats.aiCost + delta;
      return {
        stats: { ...state.stats, aiCost: total }
      };
    });
  });

  window.api.onAiUsageUpdate((payload) => {
    const data = payload as {
      promptTokens?: number;
      completionTokens?: number;
      cacheHit?: boolean;
      totals?: {
        requests?: number;
        cacheHits?: number;
        promptTokens?: number;
        completionTokens?: number;
      };
    };
    useUIStore.setState((state) => {
      const totals = data.totals ?? {};
      const promptTokens =
        typeof totals.promptTokens === "number" ? totals.promptTokens : state.stats.aiPromptTokens;
      const completionTokens =
        typeof totals.completionTokens === "number" ? totals.completionTokens : state.stats.aiCompletionTokens;
      const aiRequests = typeof totals.requests === "number" ? totals.requests : state.stats.aiRequests;
      const aiCacheHits = typeof totals.cacheHits === "number" ? totals.cacheHits : state.stats.aiCacheHits;
      return {
        stats: {
          ...state.stats,
          aiPromptTokens: promptTokens,
          aiCompletionTokens: completionTokens,
          aiRequests,
          aiCacheHits
        }
      };
    });
  });
};
