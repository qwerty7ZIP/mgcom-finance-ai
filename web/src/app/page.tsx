import { ThemeToggle } from "@/components/ThemeToggle";
import { Dashboard } from "@/components/Dashboard";
import { getDbTable } from "@/lib/dbTable";

export default async function Home() {
  const { columns, rows } = await getDbTable("clients");

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
        <ThemeToggle />
      </header>

      {/* Основной контент: Дашборд с таблицей и чатом */}
      <main className="flex flex-1 overflow-hidden">
        <Dashboard initialColumns={columns} initialRows={rows} />
      </main>
    </div>
  );
}
