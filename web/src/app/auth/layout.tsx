import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Верхняя панель — как на дашборде */}
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
            href="/"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            На главную
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}
