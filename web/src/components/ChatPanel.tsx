"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Совместимость с существующими импортами в DataTable.
export type TableRequest = {
  table?: "clients" | "contacts" | "tenders" | "active_list";
  description?: string;
  filters?: { field: string; operator: string; value: unknown }[];
  columns?: string[];
  sort?: { field: string; direction: "asc" | "desc" } | null;
  limit?: number;
};

type ChatApiResponse = {
  reply: string;
  error?: string;
};

type ChatMessage = { role: "user" | "ai"; text: string };
type ChatListItem = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};
type LocalChat = ChatListItem & { messages: ChatMessage[] };

export function ChatPanel() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [storageMode, setStorageMode] = useState<"remote" | "local">("remote");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await supabaseBrowser?.auth
      .getSession()
      .then((s) => s.data.session?.access_token ?? null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getStorageKey = async () => {
    const uid = await supabaseBrowser?.auth
      .getUser()
      .then((x) => x.data.user?.id ?? "anon")
      .catch(() => "anon");
    return `ai_chats_local_v1_${uid ?? "anon"}`;
  };

  const loadLocalChats = async (): Promise<LocalChat[]> => {
    if (typeof window === "undefined") return [];
    const key = await getStorageKey();
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as LocalChat[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveLocalChats = async (list: LocalChat[]) => {
    if (typeof window === "undefined") return;
    const key = await getStorageKey();
    window.localStorage.setItem(key, JSON.stringify(list));
  };

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/chats", { headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStorageMode("remote");
        setChats(data.chats ?? []);
      } else {
        setStorageMode("local");
        const local = await loadLocalChats();
        setChats(
          local
            .map((c) => ({
              id: c.id,
              title: c.title,
              created_at: c.created_at,
              updated_at: c.updated_at,
            }))
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
        );
      }
    } finally {
      setLoadingChats(false);
    }
  };

  const openChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setError(null);
    if (storageMode === "local") {
      const local = await loadLocalChats();
      const found = local.find((c) => c.id === chatId);
      setHistory(found?.messages ?? []);
      return;
    }
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/chats/${chatId}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось открыть чат");
        return;
      }
      const nextHistory = (data.messages ?? []).map(
        (m: { role: "user" | "ai"; content: string }) => ({
          role: m.role,
          text: m.content,
        }),
      );
      setHistory(nextHistory);
    } catch {
      setError("Не удалось открыть чат");
    }
  };

  const createNewDraftChat = () => {
    setActiveChatId(null);
    setHistory([]);
    setError(null);
  };

  const deleteChat = async (chatId: string) => {
    if (storageMode === "local") {
      const local = await loadLocalChats();
      const next = local.filter((c) => c.id !== chatId);
      await saveLocalChats(next);
      setChats(
        next
          .map((c) => ({
            id: c.id,
            title: c.title,
            created_at: c.created_at,
            updated_at: c.updated_at,
          }))
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      );
      if (activeChatId === chatId) createNewDraftChat();
      return;
    }
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) return;
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        createNewDraftChat();
      }
    } catch {
      setError("Не удалось удалить чат");
    }
  };

  useEffect(() => {
    void loadChats();
  }, []);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const userMsg = trimmed;
    setMessage("");
    setLoading(true);
    setError(null);
    const nextHistory = [...history, { role: "user" as const, text: userMsg }];
    setHistory(nextHistory);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: nextHistory,
        }),
      });

      const data = (await res.json()) as ChatApiResponse;
      if (!res.ok) {
        setError(data.error || "Ошибка запроса");
        return;
      }

      const aiReply = data.reply || "Запрос выполнен.";
      setHistory((prev) => [...prev, { role: "ai", text: aiReply }]);

      // Сохраняем чат только после первого сообщения.
      if (storageMode === "local") {
        const now = new Date().toISOString();
        const local = await loadLocalChats();
        const chatId = activeChatId ?? crypto.randomUUID();
        const existing = local.find((c) => c.id === chatId);
        const nextMessages = [...(existing?.messages ?? []), { role: "user", text: userMsg }, { role: "ai", text: aiReply }];
        const nextChat: LocalChat = {
          id: chatId,
          title: existing?.title ?? (userMsg.length > 80 ? `${userMsg.slice(0, 80)}…` : userMsg),
          created_at: existing?.created_at ?? now,
          updated_at: now,
          messages: nextMessages,
        };
        const next = [nextChat, ...local.filter((c) => c.id !== chatId)];
        await saveLocalChats(next);
        setActiveChatId(chatId);
        setChats(
          next.map((c) => ({
            id: c.id,
            title: c.title,
            created_at: c.created_at,
            updated_at: c.updated_at,
          })),
        );
      } else {
        try {
          const headers = {
            "Content-Type": "application/json",
            ...(await authHeaders()),
          };
          const syncRes = await fetch("/api/chats/sync", {
            method: "POST",
            headers,
            body: JSON.stringify({
              chatId: activeChatId,
              userMessage: userMsg,
              aiReply,
            }),
          });
          const syncData = await syncRes.json().catch(() => ({}));
          if (syncRes.ok && syncData.chatId) {
            if (!activeChatId) setActiveChatId(syncData.chatId);
            await loadChats();
          } else {
            // Мягкий фолбэк: если бэкенд хранения недоступен, переключаемся на local.
            setStorageMode("local");
          }
        } catch {
          setStorageMode("local");
        }
      }
    } catch (_err) {
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
    <section className="flex h-full min-h-0 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
        <button
          type="button"
          onClick={createNewDraftChat}
          className="mb-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          + Новый чат
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto space-y-1">
          {loadingChats && (
            <div className="px-2 py-1 text-[11px] text-slate-500">Загрузка чатов…</div>
          )}
          {!loadingChats && chats.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-slate-500">Пока нет сохраненных чатов</div>
          )}
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                activeChatId === chat.id
                  ? "bg-slate-200 dark:bg-slate-800"
                  : "hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <button
                type="button"
                onClick={() => void openChat(chat.id)}
                className="min-w-0 flex-1 truncate text-left text-xs text-slate-700 dark:text-slate-100"
                title={chat.title}
              >
                {chat.title}
              </button>
              <button
                type="button"
                onClick={() => void deleteChat(chat.id)}
                className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-300"
                title="Удалить чат"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <div className="flex flex-col">
            <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              ИИ‑ассистент
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Аналитика по данным `tenders`, `clients`, `active_list`, `contacts`.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
            ● онлайн {storageMode === "local" ? "(local)" : ""}
          </span>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-xl bg-white/80 p-3 text-[12px] dark:bg-slate-950/60"
        >
          {history.length === 0 && (
            <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              Пример: «Когда обычно у клиента X проходят тендеры по performance и кто были контакты в 2024 году?»
            </div>
          )}

          {history.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${item.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[95%] rounded-2xl px-3 py-2 shadow-sm ${
                  item.role === "user"
                    ? "bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border border-slate-100 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                {item.role === "user" ? (
                  <div className="whitespace-pre-wrap">{item.text}</div>
                ) : (
                  <div className="prose prose-sm max-w-none prose-headings:my-2 prose-p:my-1 prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ ...props }) => (
                          <div className="my-2 overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-600">
                            <table
                              className="min-w-full border-collapse text-xs"
                              {...props}
                            />
                          </div>
                        ),
                        thead: ({ ...props }) => (
                          <thead className="bg-slate-100 dark:bg-slate-700/60" {...props} />
                        ),
                        tr: ({ ...props }) => (
                          <tr className="border-b border-slate-300 dark:border-slate-600" {...props} />
                        ),
                        th: ({ ...props }) => (
                          <th
                            className="border-r border-slate-300 px-2 py-1.5 text-left font-semibold last:border-r-0 dark:border-slate-600"
                            {...props}
                          />
                        ),
                        td: ({ ...props }) => (
                          <td
                            className="border-r border-slate-300 px-2 py-1.5 align-top last:border-r-0 dark:border-slate-600"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {item.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="max-w-[92%] animate-pulse rounded-2xl border border-slate-100 bg-white px-3 py-2 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                Анализирую данные и формирую ответ...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2 rounded-2xl bg-red-100 px-3 py-2 text-[11px] text-red-800 shadow-sm dark:bg-red-900/60 dark:text-red-100">
            {error}
          </div>
        )}

        <form className="mt-3 flex shrink-0 flex-col gap-2" onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm focus-within:border-slate-400 dark:border-slate-700 dark:bg-slate-950/60 dark:focus-within:border-slate-400">
            <textarea
              rows={3}
              className="max-h-40 w-full resize-none border-none bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
              placeholder="Задайте вопрос по BI/CRM-данным..."
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
              "Покажи топ-10 клиентов по сумме бюджетов тендеров за 2025 и долю выигранных",
              "Какие контакты есть у клиента Яндекс и какие у них должности?",
              "Когда обычно у Яндекса проходят тендеры по performance за последние 3 года?",
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
      </div>
    </section>
  );
}

