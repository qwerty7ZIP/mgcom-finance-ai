"use client";

import { useEffect, useRef, useState } from "react";

export type TableRequest = {
  table?: "clients" | "contacts" | "tenders";
  description?: string;
  filters?: {
    field: string;
    operator: string;
    value: any;
  }[];
  columns?: string[];
  sort?: {
    field: string;
    direction: "asc" | "desc";
  } | null;
  limit?: number;
};

type ChatApiResponse = {
  reply: string;
  data: any;
  error?: string;
};

type Props = {
  onApplyRequest?: (request: TableRequest) => void;
};

export function ChatPanel({ onApplyRequest }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ role: "user" | "ai"; text: string; request?: TableRequest }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const userMsg = trimmed;
    setMessage("");
    setLoading(true);
    setError(null);
    setHistory(prev => [...prev, { role: "user", text: userMsg }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: history // Отправляем всю историю для контекста
        }),
      });

      const data = (await res.json()) as ChatApiResponse;
      if (!res.ok) {
        setError(data.error || "Ошибка запроса");
        return;
      }

      // Извлекаем данные запроса (они могут быть в data.tableRequest или в корне data.data)
      const requestData = data.data?.tableRequest ?? data.data;
      const aiReply =
        typeof data.data?.message === "string"
          ? data.data.message
          : data.reply || "Запрос выполнен.";

      setHistory(prev => [...prev, { role: "ai", text: aiReply, request: requestData }]);

      if (onApplyRequest && requestData) {
        onApplyRequest(requestData);
      }
    } catch (err) {
      setError("Не удалось связаться с сервером");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  const applyExample = (text: string) => {
    setMessage(text);
  };

  return (
    <aside className="ml-4 flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <header className="mb-3 shrink-0 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            ИИ‑ассистент
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Сформулируйте запрос к данным компании.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
          ● онлайн
        </span>
      </header>

      {/* История чата */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-xl bg-white/80 p-3 text-[12px] dark:bg-slate-950/60"
      >
        {history.length === 0 && (
          <div className="max-w-[92%] rounded-2xl bg-slate-900 px-3 py-2 text-slate-100 shadow-sm dark:bg-slate-100 dark:text-slate-900">
            Пример: «Покажи выручку клиентов за 2024 год больше 1 млн».
          </div>
        )}

        {history.map((item, idx) => (
          <div key={idx} className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[92%] rounded-2xl px-3 py-2 shadow-sm ${item.role === 'user'
              ? 'bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900'
              : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700'
              }`}>
              <div className="whitespace-pre-wrap">{item.text}</div>
            </div>

            {item.request && item.role === 'ai' && (
              <div className="mt-2 w-[92%] rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 text-[10px] text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-100">
                <div className="flex items-center gap-2 font-semibold opacity-70 mb-1 text-[9px] uppercase tracking-wider">
                  <span>Обновление таблицы</span>
                  <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>📂 {item.request.table || 'clients'}</span>
                  {item.request.sort && <span>↕️ {item.request.sort.field}</span>}
                  {item.request.filters && item.request.filters.length > 0 && (
                    <span>🔍 Фильтров: {item.request.filters.length}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="max-w-[92%] rounded-2xl bg-white border border-slate-100 px-3 py-2 text-slate-400 animate-pulse dark:bg-slate-800 dark:border-slate-700">
              Генерирую ответ...
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-100 px-3 py-2 text-[11px] text-red-800 shadow-sm dark:bg-red-900/60 dark:text-red-100">
            {error}
          </div>
        )}
      </div>

      {/* Поле ввода */}
      <form className="mt-3 shrink-0 flex flex-col gap-2" onSubmit={handleSubmit}>
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm focus-within:border-slate-400 dark:border-slate-700 dark:bg-slate-950/60 dark:focus-within:border-slate-400">
          <textarea
            rows={2}
            className="max-h-32 w-full resize-none border-none bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
            placeholder="Задайте вопрос по данным..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-slate-50 shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {loading ? "…" : "▶"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            "Покажи тендеры за прошлый месяц",
            "Выручка больше 1 млн за 2024",
            "Топ-5 тендеров по бюджету",
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => applyExample(chip)}
              className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {chip}
            </button>
          ))}
        </div>
      </form>
    </aside>
  );
}

