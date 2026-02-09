"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseBrowser) {
      setLoading(false);
      return;
    }
    supabaseBrowser.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      setLoading(false);
      if (!u) router.replace("/auth/sign-in");
    });
  }, [router]);

  async function handleSignOut() {
    await supabaseBrowser?.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    const trimmed = password.trim();
    if (trimmed.length < 6) {
      setPasswordError("Пароль должен быть не короче 6 символов.");
      return;
    }
    if (trimmed !== passwordConfirm) {
      setPasswordError("Пароли не совпадают.");
      return;
    }
    if (!supabaseBrowser) {
      setPasswordError("Supabase не настроен.");
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabaseBrowser.auth.updateUser({ password: trimmed });
    setPasswordLoading(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPasswordSuccess("Пароль успешно изменён.");
    setPassword("");
    setPasswordConfirm("");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 dark:border-slate-800 dark:bg-slate-900/70">
        <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          ← На главную
        </Link>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 p-6">
        <h1 className="mb-6 text-xl font-semibold">Личный кабинет</h1>
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-medium">Сменить пароль</h2>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                Новый пароль
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-foreground dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label htmlFor="new-password-confirm" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                Повторите пароль
              </label>
              <input
                id="new-password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-foreground dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>}
            <button
              type="submit"
              disabled={passwordLoading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {passwordLoading ? "Сохранение…" : "Сохранить пароль"}
            </button>
          </form>
        </section>

        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Выйти
        </button>
      </main>
    </div>
  );
}
