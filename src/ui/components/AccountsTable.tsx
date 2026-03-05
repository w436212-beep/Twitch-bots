import React, { useCallback, useMemo, useState } from "react";
import { useUIStore } from "../store";
import { Account } from "../../utils/types";

interface LoadAccountsResponse {
  accounts?: Account[];
  errors?: Array<{ line: number; raw: string; reason: string }>;
  error?: string;
}

export const AccountsTable: React.FC = () => {
  const accounts = useUIStore((state) => state.accounts);
  const accountErrors = useUIStore((state) => state.accountErrors);
  const setAccounts = useUIStore((state) => state.setAccounts);
  const setAccountErrors = useUIStore((state) => state.setAccountErrors);
  const setLastAccountsText = useUIStore((state) => state.setLastAccountsText);
  const [rawInput, setRawInput] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "online" | "idle" | "error">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const stats = useMemo(() => {
    return {
      loaded: accounts.length + accountErrors.length,
      valid: accounts.length,
      errors: accountErrors.length
    };
  }, [accounts.length, accountErrors.length]);

  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (filterStatus !== "all") {
      list = list.filter((acc) => acc.status === filterStatus);
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((acc) => acc.username.toLowerCase().includes(query));
    }
    return list;
  }, [accounts, filterStatus, searchQuery]);

  const applyLoaded = useCallback(
    (result: LoadAccountsResponse) => {
      if (result.accounts) setAccounts(result.accounts);
      if (result.errors) setAccountErrors(result.errors);
      setIsAddOpen(false); // Close the accordion/modal after success
    },
    [setAccounts, setAccountErrors]
  );

  const loadAccounts = useCallback(
    async (text: string) => {
      setLastAccountsText(text);
      try {
        const result = (await window.api.loadAccounts(text)) as LoadAccountsResponse;
        applyLoaded(result);
      } catch {
        // ignore for now
      }
    },
    [applyLoaded, setLastAccountsText]
  );

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        void loadAccounts(text);
      };
      reader.readAsText(file);
    },
    [loadAccounts]
  );

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const exportCsv = (): void => {
    if (accountErrors.length === 0) return;
    const header = "line,raw,reason";
    const rows = accountErrors.map((err) =>
      [err.line, JSON.stringify(err.raw), JSON.stringify(err.reason)].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "account_errors.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="border border-slate-700 bg-slate-800 rounded-lg p-3 flex flex-col h-full shadow-md text-slate-200"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="font-semibold text-slate-100 mb-2 flex justify-between items-center">
        <span>Аккаунты</span>
        <button
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          {isAddOpen ? "Закрыть" : "+ Добавить"}
        </button>
      </div>

      <div className="text-xs text-slate-400 mb-2">
        Загружено: <span className="text-slate-200">{stats.loaded}</span> |
        Валидных: <span className="text-green-400">{stats.valid}</span> |
        Ошибок: <span className="text-red-400">{stats.errors}</span>
      </div>

      {isAddOpen && (
        <div className="mb-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
          <div className="flex gap-2 mb-2">
            <input
              type="file"
              accept=".txt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="text-sm text-slate-300 flex-1 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-600 file:text-white hover:file:bg-slate-500"
            />
            <button
              onClick={exportCsv}
              disabled={accountErrors.length === 0}
              className="bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              CSV Ошибок
            </button>
          </div>
          <textarea
            placeholder="Вставьте аккаунты построчно"
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            className="w-full h-24 p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none mb-2"
          />
          <button
            onClick={() => void loadAccounts(rawInput)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm transition-colors"
          >
            Загрузить из текста
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex rounded overflow-hidden">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1 text-sm ${filterStatus === "all" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >Все</button>
          <button
            onClick={() => setFilterStatus("online")}
            className={`px-3 py-1 text-sm ${filterStatus === "online" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >Онлайн</button>
          <button
            onClick={() => setFilterStatus("error")}
            className={`px-3 py-1 text-sm ${filterStatus === "error" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >Ошибки</button>
        </div>
        <input
          type="text"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="flex-1 min-w-[100px] bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex-1 overflow-auto rounded border border-slate-700 bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800 sticky top-0 border-b border-slate-700 shadow-sm">
            <tr>
              <th className="p-2 font-medium text-slate-400">Статус</th>
              <th className="p-2 font-medium text-slate-400">Username</th>
              <th className="p-2 font-medium text-slate-400">Uptime</th>
              <th className="p-2 font-medium text-slate-400">Сообщ.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredAccounts.map((acc) => (
              <tr key={acc.username} className="hover:bg-slate-800 transition-colors">
                <td className="p-2 whitespace-nowrap flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${acc.status === 'online' ? 'bg-green-500' : acc.status === 'error' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
                  {acc.status === "online" ? (
                    <>
                      <span className="text-green-400">Online</span>
                      {acc.isViewing && (
                        <span className="ml-1" title="Viewing stream">
                          👁️
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 capitalize">{acc.status}</span>
                  )}
                </td>
                <td className="p-2 text-slate-300 truncate max-w-[100px]" title={acc.username}>{acc.username}</td>
                <td className="p-2 text-slate-400">{acc.connectedAt ? Math.floor((Date.now() - acc.connectedAt) / 1000) + "s" : "-"}</td>
                <td className="p-2 text-slate-300">{acc.messagesSent}</td>
              </tr>
            ))}
            {filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500 italic">Нет аккаунтов</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
