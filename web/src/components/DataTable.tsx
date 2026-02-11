"use client";

import { useEffect, useMemo, useState } from "react";
import type { TableRequest } from "./ChatPanel";

type ColumnType = "string" | "number" | "date";

export type DataColumn = {
  key: string;
  label: string;
  type: ColumnType;
  /**
   * Системные/технические колонки (id, created_at и т.п.),
   * которые не должны отображаться пользователю по умолчанию.
   */
  hidden?: boolean;
};

export type DataRow = Record<string, string | number | Date | null>;

const AGENCY_FILTER_KEY = "agency";
const AGENCY_OPTIONS = [
  "MGCom",
  "E-Promo",
  "Resonance",
  "Артикс",
  "AGM",
  "Era",
  "Биплан",
  "MGrowth",
  "Mediasystem",
  "Mediaminded",
  "Mediamaker",
  "m360",
  "Blacklight",
  "Group4Media",
  "DataStories",
];

type SortState = {
  key: string | null;
  direction: "asc" | "desc";
};

type Props = {
  columns: DataColumn[];
  rows: DataRow[];
  activeRequest?: TableRequest | null;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 0];

export function DataTable({ columns, rows, activeRequest }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    () => columns.filter((c) => !c.hidden).map((c) => c.key),
  );
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRanges, setDateRanges] = useState<
    Record<string, { from?: string; to?: string }>
  >({});
  const [multiFilters, setMultiFilters] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Синхронизация с запросом от ИИ
  useEffect(() => {
    if (!activeRequest) return;

    console.log("Applying AI request to table:", activeRequest);

    const findColumn = (fieldName: string) => {
      const lowName = (fieldName || "").toLowerCase();
      // 1. Точное совпадение
      let found = columns.find(c =>
        c.key.toLowerCase() === lowName ||
        c.label.toLowerCase() === lowName
      );
      if (found) return found;

      // 2. Частичное совпадение (например, ИИ прислал "выручка", а колонка "Выручка (руб)")
      found = columns.find(c =>
        c.key.toLowerCase().includes(lowName) ||
        c.label.toLowerCase().includes(lowName)
      );
      return found;
    };

    // 1. Колонки
    if (activeRequest.columns && activeRequest.columns.length > 0) {
      const requestedKeys = activeRequest.columns
        .map(reqCol => findColumn(reqCol)?.key)
        .filter(Boolean) as string[];

      if (requestedKeys.length > 0) {
        setVisibleColumns(requestedKeys);
      }
    } else {
      setVisibleColumns(columns.filter(c => !c.hidden).map(c => c.key));
    }

    // 2. Сортировка
    if (activeRequest.sort && activeRequest.sort.field) {
      const foundSort = findColumn(activeRequest.sort.field);
      if (foundSort) {
        setSort({
          key: foundSort.key,
          direction: activeRequest.sort.direction || "asc"
        });
      }
    }

    // 3. Фильтры
    if (activeRequest.filters && activeRequest.filters.length > 0) {
      const newFilters: Record<string, string> = {};
      const newDateRanges: Record<string, { from?: string; to?: string }> = {};
      const newMulti: Record<string, string[]> = {};

      activeRequest.filters.forEach((f) => {
        const foundCol = findColumn(f.field);
        if (!foundCol) return;

        const value = String(f.value ?? "");
        const op = (f.operator || "").toLowerCase();

        // Мульти-фильтры по агентствам
        if (foundCol.key === AGENCY_FILTER_KEY && value) {
          newMulti[AGENCY_FILTER_KEY] = [value];
          return;
        }

        if (foundCol.type === "date") {
          const key = foundCol.key;
          const current = newDateRanges[key] || {};

          if (op === "gte" || op === "gt") {
            current.from = value;
          } else if (op === "lte" || op === "lt") {
            current.to = value;
          } else if (op === "eq") {
            current.from = value;
            current.to = value;
          } else if (!op && value) {
            // На всякий случай: если оператор не задан, но есть значение, считаем его нижней границей
            current.from = value;
          }

          newDateRanges[key] = current;
        } else {
          newFilters[foundCol.key] = value;
        }
      });

      setFilters(newFilters);
      setDateRanges(newDateRanges);
      setMultiFilters(newMulti);
    } else {
      setFilters({});
      setDateRanges({});
      setMultiFilters({});
    }

    setPage(1);
  }, [activeRequest, columns]);



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

  const handleDateRangeChange = (
    key: string,
    which: "from" | "to",
    value: string,
  ) => {
    setDateRanges((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [which]: value || undefined,
      },
    }));
    setPage(1);
  };

  const handleMultiSelectChange = (
    key: string,
    selectedValues: string[],
  ) => {
    setMultiFilters((prev) => ({
      ...prev,
      [key]: selectedValues,
    }));
    setPage(1);
  };

  const toggleMultiSelectValue = (key: string, value: string) => {
    setMultiFilters((prev) => {
      const current = new Set(prev[key] ?? []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return {
        ...prev,
        [key]: Array.from(current),
      };
    });
    setPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    let current = rows;

    // Фильтрация
    current = current.filter((row) =>
      columns.every((col) => {
        const filterValue = filters[col.key];

        // Мультивыбор по колонке agency
        if (col.key === AGENCY_FILTER_KEY) {
          const selected = multiFilters[AGENCY_FILTER_KEY] || [];
          if (!selected.length) return true;
          const raw = row[col.key];
          if (raw == null) return false;
          const s = String(raw);
          return selected.includes(s);
        }

        // Для дат сначала проверяем диапазон
        if (col.type === "date") {
          const range = dateRanges[col.key];

          // Если диапазон и одиночный фильтр НЕ заданы — принимаем все значения (включая null)
          if (!range?.from && !range?.to && !filterValue) {
            return true;
          }

          const raw = row[col.key];
          if (raw == null) return false;

          const date = raw instanceof Date ? raw : new Date(String(raw));
          if (Number.isNaN(date.getTime())) return true;

          if (range && (range.from || range.to)) {
            if (range.from) {
              const from = new Date(range.from);
              if (!Number.isNaN(from.getTime()) && date < from) return false;
            }
            if (range.to) {
              const to = new Date(range.to);
              if (!Number.isNaN(to.getTime()) && date > to) return false;
            }
            return true;
          }

          // Если диапазон не задан, но есть одиночное значение как раньше — используем старую логику
          if (!filterValue) return true;

          const aiFilter = activeRequest?.filters?.find((f) => {
            const lowF = (f.field || "").toLowerCase();
            return (
              col.key.toLowerCase() === lowF ||
              col.label.toLowerCase() === lowF ||
              col.key.toLowerCase().includes(lowF) ||
              col.label.toLowerCase().includes(lowF)
            );
          });

          const operator =
            aiFilter?.operator ||
            "gte"; /* по умолчанию для дат интерпретируем как "с даты..." */

          const filterDate = new Date(filterValue);
          if (
            Number.isNaN(date.getTime()) ||
            Number.isNaN(filterDate.getTime())
          )
            return true;

          if (operator === "eq") return date.getTime() === filterDate.getTime();
          if (operator === "lte") return date <= filterDate;
          if (operator === "lt") return date < filterDate;
          if (operator === "gt") return date > filterDate;
          // gte и остальные — как "с даты и позже"
          return date >= filterDate;
        }

        if (!filterValue) return true;

        // Если есть активный запрос от ИИ для этой колонки, используем его оператор
        const aiFilter = activeRequest?.filters?.find(f => {
          const lowF = (f.field || "").toLowerCase();
          return col.key.toLowerCase() === lowF ||
            col.label.toLowerCase() === lowF ||
            col.key.toLowerCase().includes(lowF) ||
            col.label.toLowerCase().includes(lowF);
        });

        const operator = aiFilter?.operator || (col.type === "number" ? "gte" : "contains");
        const raw = row[col.key];
        if (raw == null) return false;

        if (col.type === "string") {
          const sRaw = String(raw).toLowerCase();
          const sVal = filterValue.toLowerCase();
          // ilike: SQL-подобный поиск без учета регистра, допускает шаблон с %
          // contains: подстрока без шаблонов
          const normalizedVal = sVal.replace(/%/g, "").trim();
          if (!normalizedVal) return true;
          if (operator === "eq") return sRaw === normalizedVal;
          return sRaw.includes(normalizedVal);
        }

        if (col.type === "number") {
          const num = typeof raw === "number" ? raw : Number(raw);
          const target = Number(filterValue);
          if (Number.isNaN(num) || Number.isNaN(target)) return true;

          switch (operator) {
            case "eq": return num === target;
            case "gte": return num >= target;
            case "lte": return num <= target;
            case "gt": return num > target;
            case "lt": return num < target;
            default: return num >= target;
          }
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

    // Ограничение числа записей по запросу ИИ (топ-N, один с максимальным и т.д.)
    const limit = activeRequest?.limit;
    if (typeof limit === "number" && limit > 0) {
      current = current.slice(0, limit);
    }

    return current;
  }, [rows, columns, filters, sort, activeRequest?.limit]);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-400">
        Загрузка таблицы...
      </div>
    );
  }

  const effectivePageSize = pageSize === 0 ? filteredAndSorted.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / effectivePageSize));

  const currentPage = pageSize === 0 ? 1 : Math.min(page, totalPages);
  const startIndex = pageSize === 0 ? 0 : (currentPage - 1) * effectivePageSize;
  const pageRows =
    pageSize === 0
      ? filteredAndSorted
      : filteredAndSorted.slice(startIndex, startIndex + effectivePageSize);

  const visibleCols = columns.filter(
    (c) => !c.hidden && visibleColumns.includes(c.key),
  );

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
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-500 dark:focus:ring-slate-500"
              value={pageSize}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPageSize(next);
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size === 0 ? "Все" : size}
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
            <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-1 px-2 text-[11px] text-slate-500 dark:text-slate-400">
                Отметьте видимые колонки:
              </p>
              <div className="max-h-52 space-y-1 overflow-auto">
                {columns.filter(col => !col.hidden).map((col) => (
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
      <div className="flex-1 max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50/70 text-xs dark:border-slate-700 dark:bg-slate-900/80">
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
                    {col.type === "date" ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                          value={dateRanges[col.key]?.from ?? ""}
                          onChange={(e) =>
                            handleDateRangeChange(
                              col.key,
                              "from",
                              e.target.value,
                            )
                          }
                        />
                        <span className="text-[10px] text-slate-400">—</span>
                        <input
                          type="date"
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                          value={dateRanges[col.key]?.to ?? ""}
                          onChange={(e) =>
                            handleDateRangeChange(
                              col.key,
                              "to",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    ) : col.key === AGENCY_FILTER_KEY ? (
                      <details className="group relative">
                        <summary className="flex cursor-pointer items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-sm transition-colors hover:bg-slate-50 marker:content-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800">
                          <span className="truncate">
                            {multiFilters[AGENCY_FILTER_KEY]?.length
                              ? `Агентств: ${
                                  multiFilters[AGENCY_FILTER_KEY].length
                                }`
                              : "Все агентства"}
                          </span>
                          <span className="ml-1 text-[9px] text-slate-400 group-open:rotate-180">
                            ▾
                          </span>
                        </summary>
                        <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 text-[11px] shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-1 flex items-center justify-between px-1">
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                              Агентства
                            </span>
                            <button
                              type="button"
                              className="text-[10px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                              onClick={() =>
                                handleMultiSelectChange(AGENCY_FILTER_KEY, [])
                              }
                            >
                              Сбросить
                            </button>
                          </div>
                          <div className="max-h-52 space-y-1 overflow-auto">
                            {AGENCY_OPTIONS.map((name) => {
                              const selected =
                                multiFilters[AGENCY_FILTER_KEY]?.includes(
                                  name,
                                ) ?? false;
                              return (
                                <label
                                  key={name}
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                                >
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3 rounded border-slate-300 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                    checked={selected}
                                    onChange={() =>
                                      toggleMultiSelectValue(
                                        AGENCY_FILTER_KEY,
                                        name,
                                      )
                                    }
                                  />
                                  <span className="truncate">{name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </details>
                    ) : (
                      <input
                        type={col.type === "number" ? "number" : "text"}
                        placeholder={
                          col.type === "string"
                            ? "Фильтр..."
                            : "Минимум..."
                        }
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                        value={filters[col.key] ?? ""}
                        onChange={(e) =>
                          handleFilterChange(col.key, e.target.value)
                        }
                      />
                    )}
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
            disabled={currentPage === 1 || pageSize === 0}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={() =>
              setPage((p) => (p < totalPages ? p + 1 : p))
            }
            disabled={currentPage === totalPages || pageSize === 0}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
}

