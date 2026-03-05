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
      style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, height: 600, overflow: "auto" }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Аккаунты</div>
      <div style={{ marginBottom: 8, fontSize: 12 }}>
        Загружено: {stats.loaded} | Валидных: {stats.valid} | Ошибок: {stats.errors}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => setFilterStatus("all")}>Все</button>
        <button onClick={() => setFilterStatus("online")}>Онлайн</button>
        <button onClick={() => setFilterStatus("error")}>Ошибки</button>
        <input
          type="text"
          placeholder="Поиск по username..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ flex: 1 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          type="file"
          accept=".txt"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button onClick={exportCsv} disabled={accountErrors.length === 0}>
          Экспорт CSV
        </button>
      </div>
      <textarea
        placeholder="Вставьте аккаунты построчно"
        value={rawInput}
        onChange={(event) => setRawInput(event.target.value)}
        onBlur={() => void loadAccounts(rawInput)}
        style={{ width: "100%", height: 80, marginBottom: 8 }}
      />
      <table style={{ width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th align="left">Статус</th>
            <th align="left">Username</th>
            <th align="left">Uptime</th>
            <th align="left">Сообщений</th>
          </tr>
        </thead>
        <tbody>
          {filteredAccounts.map((acc) => (
            <tr key={acc.username}>
              <td>
                {acc.status === "online" ? (
                  <>
                    Online
                    {acc.isViewing && (
                      <span style={{ marginLeft: 4 }} title="Viewing stream">
                        👁️
                      </span>
                    )}
                  </>
                ) : (
                  acc.status
                )}
              </td>
              <td>{acc.username}</td>
              <td>{acc.connectedAt ? Math.floor((Date.now() - acc.connectedAt) / 1000) + "s" : "-"}</td>
              <td>{acc.messagesSent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
