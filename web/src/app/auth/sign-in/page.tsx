"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const IconMail = () => (
  <svg className="size-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const IconLock = () => (
  <svg className="size-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabaseBrowser) {
      setError("Supabase не настроен. Проверьте переменные окружения.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message === "Invalid login credentials" ? "Неверный email или пароль." : err.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h1 className="mb-6 text-xl font-semibold">Вход</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
              Email
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:border-slate-300 dark:focus-within:ring-slate-500/70">
              <IconMail />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@mgcom.ru"
                className="min-w-0 flex-1 bg-transparent text-foreground placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
              Пароль
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:border-slate-300 dark:focus-within:ring-slate-500/70">
              <IconLock />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="min-w-0 flex-1 bg-transparent text-foreground placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-amber-300 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Нет учётной записи? Обратитесь к администратору.
        </p>

        <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="underline hover:text-amber-600 dark:hover:text-amber-400">
            На главную
          </Link>
        </p>
      </div>
    </div>
  );
}
