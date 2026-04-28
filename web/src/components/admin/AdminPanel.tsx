"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Access = {
  tables: boolean;
  analytics: boolean;
  diagram: boolean;
  branches: boolean;
};

type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  access: Access;
};

const EMPTY_ACCESS: Access = { tables: false, analytics: false, diagram: false, branches: false };

async function authHeaders(): Promise<Record<string, string>> {
  const token = (await supabaseBrowser?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newAccess, setNewAccess] = useState<Access>(EMPTY_ACCESS);
  const [creating, setCreating] = useState(false);

  const hasSupabase = !!supabaseBrowser;

  async function loadUsers() {
    if (!hasSupabase) {
      setError("Supabase не настроен");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/users", { headers });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Не удалось загрузить пользователей");
      setUsers([]);
      setLoading(false);
      return;
    }
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users],
  );

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newEmail.trim() || newPassword.length < 6) {
      setError("Введите email и пароль не короче 6 символов");
      return;
    }
    setCreating(true);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        email: newEmail.trim(),
        password: newPassword,
        isAdmin: newIsAdmin,
        access: newIsAdmin
          ? { tables: true, analytics: true, diagram: true, branches: true }
          : newAccess,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось создать пользователя");
      return;
    }
    setNewEmail("");
    setNewPassword("");
    setNewIsAdmin(false);
    setNewAccess(EMPTY_ACCESS);
    await loadUsers();
  }

  async function savePermissions(user: AdminUser) {
    setSavingId(user.id);
    setError(null);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        id: user.id,
        isAdmin: user.isAdmin,
        access: user.isAdmin
          ? { tables: true, analytics: true, diagram: true, branches: true }
          : user.access,
      }),
    });
    const data = await res.json();
    setSavingId(null);
    if (!res.ok) {
      setError(data.error ?? "Не удалось обновить права");
      return;
    }
    await loadUsers();
  }

  async function savePassword(userId: string) {
    const password = (passwordDrafts[userId] ?? "").trim();
    if (password.length < 6) {
      setError("Новый пароль должен быть не короче 6 символов");
      return;
    }
    setSavingId(userId);
    setError(null);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ id: userId, password }),
    });
    const data = await res.json();
    setSavingId(null);
    if (!res.ok) {
      setError(data.error ?? "Не удалось обновить пароль");
      return;
    }
    setPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
  }

  async function removeUser(userId: string) {
    const ok = window.confirm("Удалить пользователя?");
    if (!ok) return;
    setSavingId(userId);
    setError(null);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ id: userId }),
    });
    const data = await res.json();
    setSavingId(null);
    if (!res.ok) {
      setError(data.error ?? "Не удалось удалить пользователя");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-slate-700 dark:border-t-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-auto px-4 py-4 lg:px-6 lg:py-5">
      <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <h1 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-50">
          Админ-панель пользователей
        </h1>
        <form onSubmit={handleCreateUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Пароль"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
            />
            Админ
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-amber-300 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {creating ? "Создаем..." : "Добавить пользователя"}
          </button>
        </form>
        {!newIsAdmin && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {(["diagram", "branches", "tables", "analytics"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={newAccess[k]}
                  onChange={(e) =>
                    setNewAccess((prev) => ({ ...prev, [k]: e.target.checked }))
                  }
                />
                {k === "diagram"
                  ? "Диаграмма"
                  : k === "branches"
                    ? "Ветки"
                    : k === "tables"
                      ? "ИИ-ассистент"
                      : "Аналитика"}
              </label>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {sortedUsers.map((u) => (
          <div
            key={u.id}
            className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {u.email || "—"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Создан: {new Date(u.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeUser(u.id)}
                disabled={savingId === u.id}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                Удалить
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={u.isAdmin}
                  onChange={(e) =>
                    setUsers((prev) =>
                      prev.map((x) =>
                        x.id === u.id ? { ...x, isAdmin: e.target.checked } : x,
                      ),
                    )
                  }
                />
                Админ
              </label>
              {(["diagram", "branches", "tables", "analytics"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={u.isAdmin ? true : u.access[k]}
                    disabled={u.isAdmin}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) =>
                          x.id === u.id
                            ? { ...x, access: { ...x.access, [k]: e.target.checked } }
                            : x,
                        ),
                      )
                    }
                  />
                  {k === "diagram"
                    ? "Диаграмма"
                    : k === "branches"
                      ? "Ветки"
                      : k === "tables"
                        ? "ИИ-ассистент"
                        : "Аналитика"}
                </label>
              ))}
              <button
                type="button"
                onClick={() => savePermissions(u)}
                disabled={savingId === u.id}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Сохранить права
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                value={passwordDrafts[u.id] ?? ""}
                onChange={(e) =>
                  setPasswordDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                }
                placeholder="Новый пароль"
                className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => savePassword(u.id)}
                disabled={savingId === u.id}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Сменить пароль
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

