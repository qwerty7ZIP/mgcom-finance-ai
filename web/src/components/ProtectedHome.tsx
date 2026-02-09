"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Dashboard } from "@/components/Dashboard";
import type { DataColumn, DataRow } from "@/components/DataTable";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Props = {
  initialColumns: DataColumn[];
  initialRows: DataRow[];
};

export function ProtectedHome({ initialColumns, initialRows }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabaseBrowser) {
      router.replace("/auth/sign-in");
      return;
    }

    supabaseBrowser.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/sign-in");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-amber-300 shadow-sm dark:bg-slate-100 dark:text-slate-900">
              MG
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                MGCOM Finance AI
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Таблицы + ИИ‑чат по корпоративным данным
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
            <div
              className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-slate-700 dark:border-t-amber-400"
              aria-hidden
            />
            <span className="text-xs">Проверяем авторизацию…</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* Верхняя панель */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-amber-300 shadow-sm dark:bg-slate-100 dark:text-slate-900">
            MG
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">
              MGCOM Finance AI
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Таблицы + ИИ‑чат по корпоративным данным
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-amber-300 dark:bg-slate-100 dark:text-slate-900"
              aria-hidden
            >
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </span>
            <span>Личный кабинет</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Основной контент: Дашборд с таблицей и чатом */}
      <main className="flex flex-1 overflow-hidden">
        <Dashboard initialColumns={initialColumns} initialRows={initialRows} />
      </main>
    </div>
  );
}

