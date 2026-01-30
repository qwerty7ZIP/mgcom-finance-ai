 "use client";

import { useMemo, useState } from "react";

type ColumnType = "string" | "number" | "date";

export type DataColumn = {
  key: string;
  label: string;
  type: ColumnType;
};

export type DataRow = Record<string, string | number | Date | null>;

type SortState = {
  key: string | null;
  direction: "asc" | "desc";
};

type Props = {
  columns: DataColumn[];
  rows: DataRow[];
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function DataTable({ columns, rows }: Props) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    () => columns.map((c) => c.key),
  );
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const toggleColumnVisibility = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    let current = rows;

    // Фильтрация
    current = current.filter((row) =>
      columns.every((col) => {
        const filterValue = filters[col.key];
        if (!filterValue) return true;

        const raw = row[col.key];
        if (raw == null) return false;

        if (col.type === "string") {
          return String(raw).toLowerCase().includes(filterValue.toLowerCase());
        }

        if (col.type === "number") {
          const num = typeof raw === "number" ? raw : Number(raw);
          const target = Number(filterValue);
          if (Number.isNaN(num) || Number.isNaN(target)) return true;
          // Простое правило: num >= target
          return num >= target;
        }

        if (col.type === "date") {
          const date = raw instanceof Date ? raw : new Date(String(raw));
          const filterDate = new Date(filterValue);
          if (Number.isNaN(date.getTime()) || Number.isNaN(filterDate.getTime()))
            return true;
          // Простое правило: date >= filterDate
          return date >= filterDate;
        }

        return true;
      }),
    );

    // Сортировка
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const { key } = col;
        const dir = sort.direction === "asc" ? 1 : -1;
        current = [...current].sort((a, b) => {
          const av = a[key];
          const bv = b[key];
          if (av == null && bv == null) return 0;
          if (av == null) return -1 * dir;
          if (bv == null) return 1 * dir;

          if (col.type === "number") {
            const an = typeof av === "number" ? av : Number(av);
            const bn = typeof bv === "number" ? bv : Number(bv);
            return (an - bn) * dir;
          }

          if (col.type === "date") {
            const ad = av instanceof Date ? av : new Date(String(av));
            const bd = bv instanceof Date ? bv : new Date(String(bv));
            return (ad.getTime() - bd.getTime()) * dir;
          }

          return String(av).localeCompare(String(bv)) * dir;
        });
      }
    }

    return current;
  }, [rows, columns, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filteredAndSorted.slice(startIndex, startIndex + pageSize);

  const visibleCols = columns.filter((c) => visibleColumns.includes(c.key));

  const handleExportCSV = () => {
    const exportRows = filteredAndSorted;
    if (!exportRows.length) return;

    const header = visibleCols.map((c) => c.label);
    const lines = [header.join(";")];

    exportRows.forEach((row) => {
      const values = visibleCols.map((col) => {
        const value = row[col.key];
        if (value == null) return "";
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        const str = String(value).replace(/"/g, '""');
        return `"${str}"`;
      });
      lines.push(values.join(";"));
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mgcom-finance-ai-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Панель управления таблицей */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-700 dark:text-slate-100">
            Всего записей:
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
            {filteredAndSorted.length}
          </span>
          <span className="ml-2 text-slate-400">Страница {currentPage}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
            На странице:
            <select
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Экспорт CSV
          </button>
          <details className="group relative">
            <summary className="flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 marker:content-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
              Колонки
              <span className="ml-1 text-[9px] text-slate-400 group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-1 px-2 text-[11px] text-slate-500 dark:text-slate-400">
                Отметьте видимые колонки:
              </p>
              <div className="max-h-52 space-y-1 overflow-auto">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-slate-300 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumnVisibility(col.key)}
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Таблица */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50/70 text-xs dark:border-slate-700 dark:bg-slate-900/80">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-slate-100 text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-semibold dark:border-slate-800 dark:bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="flex w-full items-center justify-between gap-2 text-left text-[11px] text-slate-700 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white"
                  >
                    <span>{col.label}</span>
                    <span className="text-[9px] text-slate-400">
                      {sort.key === col.key
                        ? sort.direction === "asc"
                          ? "▲"
                          : "▼"
                        : "⇅"}
                    </span>
                  </button>
                  {/* Фильтр по колонке */}
                  <div className="mt-1">
                    <input
                      type={col.type === "number" ? "number" : "text"}
                      placeholder={
                        col.type === "string"
                          ? "Фильтр..."
                          : col.type === "number"
                            ? "Минимум..."
                            : "С даты..."
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                      value={filters[col.key] ?? ""}
                      onChange={(e) =>
                        handleFilterChange(col.key, e.target.value)
                      }
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-100/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                {visibleCols.map((col) => {
                  const value = row[col.key];
                  let display: string = "";
                  if (value instanceof Date) {
                    display = value.toLocaleDateString("ru-RU");
                  } else if (value != null) {
                    display = String(value);
                  }
                  return (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700 dark:text-slate-100"
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleCols.length || 1}
                  className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400"
                >
                  Нет записей, удовлетворяющих текущим фильтрам.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <div>
          Страница {currentPage} из {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={() =>
              setPage((p) => (p < totalPages ? p + 1 : p))
            }
            disabled={currentPage === totalPages}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
}

