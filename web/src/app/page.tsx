import { ThemeToggle } from "@/components/ThemeToggle";
import { DataTable } from "@/components/DataTable";
import { getDemoTable } from "@/lib/demoTable";

export default async function Home() {
  const { columns, rows } = await getDemoTable();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Верхняя панель */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
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

      {/* Основной контент: таблица + чат */}
      <main className="flex flex-1 overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
        {/* Область таблицы */}
        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Таблица данных
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Здесь будут результаты запросов к данным клиентов, контактам и
                тендерам.
              </p>
            </div>
          </header>

          {/* Компонент таблицы с фильтрами/сортировкой/пагинацией */}
          <div className="flex-1">
            {columns.length > 0 ? (
              <DataTable columns={columns} rows={rows} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                Не удалось загрузить данные из Excel. Проверьте наличие файла
                {" "}
                <span className="mx-1 rounded bg-slate-200 px-1 py-0.5 font-mono text-[10px] dark:bg-slate-800">
                  клиенты-ai.xlsx
                </span>
                в папке
                {" "}
                <span className="mx-1 rounded bg-slate-200 px-1 py-0.5 font-mono text-[10px] dark:bg-slate-800">
                  data-files
                </span>
                .
              </div>
            )}
          </div>
        </section>

        {/* Боковая панель чата ИИ */}
        <aside className="ml-4 flex w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <header className="mb-3 flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                ИИ‑ассистент
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Сформулируйте, какую таблицу вы хотите увидеть.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
              ● онлайн
            </span>
          </header>

          {/* История чата (заглушка) */}
          <div className="flex-1 space-y-3 overflow-auto rounded-xl bg-white/80 p-3 dark:bg-slate-950/60">
            <div className="max-w-[92%] rounded-2xl bg-slate-900 px-3 py-2 text-[12px] text-slate-100 shadow-sm dark:bg-slate-100 dark:text-slate-900">
              Пример запроса: «Покажи всех клиентов с тендерами за 2024 год c
              суммой больше 1 млн и добавь колонку с ответственным менеджером».
            </div>
            <div className="flex justify-end">
              <div className="max-w-[92%] rounded-2xl bg-amber-100 px-3 py-2 text-[12px] text-amber-900 shadow-sm dark:bg-amber-900/60 dark:text-amber-50">
                В ответ ИИ построит таблицу слева и предложит фильтры по
                колонкам.
              </div>
            </div>
          </div>

          {/* Поле ввода */}
          <form className="mt-3 flex flex-col gap-2">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm focus-within:border-slate-400 dark:border-slate-700 dark:bg-slate-950/60 dark:focus-within:border-slate-400">
              <textarea
                rows={2}
                className="max-h-32 w-full resize-none border-none bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
                placeholder="Напишите, какие данные вам нужны: фильтры, период, колонки..."
              />
              <button
                type="submit"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-slate-50 shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                ▶
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                "Клиенты с ростом выручки",
                "Проблемные тендеры",
                "Новые клиенты за квартал",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {chip}
                </button>
              ))}
            </div>
          </form>
        </aside>
      </main>
    </div>
  );
}
