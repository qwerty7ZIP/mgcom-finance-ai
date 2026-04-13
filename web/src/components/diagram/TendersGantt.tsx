"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DataRow = Record<string, string | number | Date | null>;
type Scale = "day" | "week" | "month";

type GanttItem = {
  id: string;
  client: string;
  project: string;
  agency: string;
  manager: string;
  status: string;
  start: Date;
  end: Date;
  futureStart: Date;
  futureEnd: Date;
};

const ROW_HEIGHT = 44;

const SCALE_DAY_MS: Record<Scale, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

const STATUS_COLORS: Record<string, string> = {
  "Выигран тендер": "bg-emerald-500/90",
  Размещается: "bg-emerald-400/90",
  "Проигран тендер": "bg-red-500/90",
  "Не участвовали": "bg-slate-500/80",
  Отмененная: "bg-amber-500/90",
  Завершенная: "bg-slate-400/80",
};

const FUTURE_STATUS_COLORS: Record<string, string> = {
  "Выигран тендер": "bg-emerald-500/25 border border-dashed border-emerald-400/70",
  Размещается: "bg-emerald-400/25 border border-dashed border-emerald-300/70",
  "Проигран тендер": "bg-red-500/25 border border-dashed border-red-400/70",
  "Не участвовали": "bg-slate-500/20 border border-dashed border-slate-400/70",
  Отмененная: "bg-amber-500/25 border border-dashed border-amber-400/70",
  Завершенная: "bg-slate-400/20 border border-dashed border-slate-300/70",
};

function toIsoDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function getStr(row: DataRow, key: string): string {
  const v = row[key] ?? row[key.toLowerCase()];
  if (v == null) return "";
  return String(v).trim();
}

function toItem(row: DataRow, idx: number): GanttItem | null {
  const start = parseDate(row.tender_start ?? row.Tender_start);
  const endRaw = parseDate(row.tender_end ?? row.tender_dl ?? row.Tender_end);
  if (!start) return null;
  const end = endRaw && endRaw >= start ? endRaw : start;
  const futureStart = new Date(start);
  futureStart.setFullYear(futureStart.getFullYear() + 1);
  const futureEnd = new Date(
    futureStart.getTime() + 21 * 24 * 60 * 60 * 1000,
  );

  return {
    id: getStr(row, "id_pf") || getStr(row, "id") || `row-${idx}`,
    client: getStr(row, "client") || "—",
    project: getStr(row, "project") || "—",
    agency: getStr(row, "agency") || "—",
    manager: getStr(row, "manager") || "—",
    status: getStr(row, "tender_status") || "Без статуса",
    start,
    end,
    futureStart,
    futureEnd,
  };
}

export function TendersGantt() {
  const router = useRouter();
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<Scale>("week");
  const didInitialTodayScrollRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef(new Date());

  const openTenderCard = (id: string) => {
    if (!id) return;
    router.push(`/tenders/${encodeURIComponent(id)}`);
  };

  const parseRowsToItems = (rows: DataRow[], baseIndex = 0): GanttItem[] => {
    const dateCache = new Map<string, Date | null>();
    const parseCachedDate = (raw: unknown): Date | null => {
      if (raw instanceof Date) return raw;
      if (typeof raw !== "string") return null;
      const key = raw.trim();
      if (!key) return null;
      if (dateCache.has(key)) return dateCache.get(key) ?? null;
      const parsed = parseDate(key);
      dateCache.set(key, parsed);
      return parsed;
    };

    return rows
      .map((row, i) => {
        const start = parseCachedDate(row.tender_start ?? row.Tender_start);
        const endRaw = parseCachedDate(
          row.tender_end ?? row.tender_dl ?? row.Tender_end,
        );
        if (!start) return null;
        const end = endRaw && endRaw >= start ? endRaw : start;
        const futureStart = new Date(start);
        futureStart.setFullYear(futureStart.getFullYear() + 1);
        const futureEnd = new Date(
          futureStart.getTime() + 21 * 24 * 60 * 60 * 1000,
        );
        return {
          id: getStr(row, "id_pf") || getStr(row, "id") || `row-${baseIndex + i}`,
          client: getStr(row, "client") || "—",
          project: getStr(row, "project") || "—",
          agency: getStr(row, "agency") || "—",
          manager: getStr(row, "manager") || "—",
          status: getStr(row, "tender_status") || "Без статуса",
          start,
          end,
          futureStart,
          futureEnd,
        } satisfies GanttItem;
      })
      .filter((x): x is GanttItem => x !== null);
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const requestBodyBase = {
      rowsOnly: true,
      tableRequest: {
        table: "tenders",
        sort: { field: "tender_start", direction: "asc" as const },
        filters: [
          {
            field: "tender_start",
            operator: "gte",
            value: toIsoDateOnly(
              new Date(
                todayRef.current.getFullYear() - 1,
                todayRef.current.getMonth(),
                todayRef.current.getDate(),
              ),
            ),
          },
          {
            field: "tender_start",
            operator: "lte",
            value: toIsoDateOnly(
              new Date(
                todayRef.current.getFullYear() + 1,
                todayRef.current.getMonth(),
                todayRef.current.getDate(),
              ),
            ),
          },
        ],
        columns: [
          "id",
          "id_pf",
          "client",
          "project",
          "agency",
          "manager",
          "tender_status",
          "tender_start",
          "tender_end",
          "tender_dl",
        ],
      },
    };

    const fetchAllRows = async () => {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBodyBase),
        signal: controller.signal,
      });
      return res.json();
    };

    setLoading(true);
    fetchAllRows()
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setItems([]);
          setLoading(false);
          return;
        }

        const allRows = data.rows ?? [];
        setError(null);
        setItems(parseRowsToItems(allRows, 0));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить данные для диаграммы");
          setItems([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const timeline = useMemo(() => {
    if (!items.length) return null;
    const minStart = items[0].start.getTime();
    const maxEnd = items.reduce(
      (m, it) => Math.max(m, it.end.getTime(), it.futureEnd.getTime()),
      minStart,
    );
    return {
      minStart,
      maxEnd,
      viewportStart: minStart,
      viewportEnd: maxEnd,
    };
  }, [items]);

  const pxPerDay = scale === "day" ? 36 : scale === "week" ? 14 : 6;
  const todayTs = todayRef.current.getTime();
  const ticks = useMemo(() => {
    if (!timeline) return [];
    const totalDaysLocal = Math.max(
      1,
      Math.ceil((timeline.viewportEnd - timeline.viewportStart) / SCALE_DAY_MS.day),
    );
    return Array.from({ length: totalDaysLocal + 1 }, (_, i) => {
      const ts = timeline.viewportStart + i * SCALE_DAY_MS.day;
      const d = new Date(ts);
      let label = "";
      if (scale === "day") label = `${d.getDate()}.${d.getMonth() + 1}`;
      if (scale === "week") {
        const weekNum = Math.ceil(
          (d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7,
        );
        label = `W${weekNum} ${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      if (scale === "month") {
        label = `${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
      }
      return { ts, label };
    }).filter((_, i) =>
      scale === "day" ? true : scale === "week" ? i % 7 === 0 : i % 30 === 0,
    );
  }, [timeline, scale]);

  const scrollToToday = () => {
    if (!timeline || !scrollRef.current || items.length === 0) return;
    const container = scrollRef.current;
    const leftColWidth = 300;

    const todayLeft = ((todayTs - timeline.viewportStart) / SCALE_DAY_MS.day) * pxPerDay;
    const targetLeft = Math.max(
      0,
      leftColWidth + todayLeft - container.clientWidth / 2,
    );

    // По вертикали фокусируемся на ближайшей будущей дате старта
    // (futureStart = start + 1 год). Если вдруг все даты в прошлом — fallback на ближайшую.
    let minFutureDist = Number.POSITIVE_INFINITY;
    let nearestIndex = 0;
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      const futureStartTs = it.futureStart.getTime();
      if (futureStartTs >= todayTs) {
        const dist = futureStartTs - todayTs;
        if (dist < minFutureDist) {
          minFutureDist = dist;
          nearestIndex = i;
        }
      }
    }

    if (!Number.isFinite(minFutureDist)) {
      let minAbsDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i];
        const dist = Math.abs(it.futureStart.getTime() - todayTs);
        if (dist < minAbsDist) {
          minAbsDist = dist;
          nearestIndex = i;
        }
      }
    }
    const targetTop = Math.max(
      0,
      nearestIndex * ROW_HEIGHT - container.clientHeight / 2 + ROW_HEIGHT / 2,
    );

    // Важно прокручивать и по X, и по Y одним вызовом:
    // иначе второй scrollTo может отменить первый в некоторых браузерах.
    container.scrollTo({
      left: targetLeft,
      top: targetTop,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (didInitialTodayScrollRef.current) return;
    if (loading || !timeline || items.length === 0) return;

    didInitialTodayScrollRef.current = true;
    // Ждём, пока браузер отрисует строки и sticky-области, затем скроллим к today.
    requestAnimationFrame(() => {
      scrollToToday();
    });
  }, [loading, timeline, items.length]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-slate-700 dark:border-t-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (!timeline || items.length === 0) {
    return (
      <div className="m-4 rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
        Нет данных для отображения диаграммы.
      </div>
    );
  }

  const totalDays = Math.max(
    1,
    Math.ceil((timeline.viewportEnd - timeline.viewportStart) / SCALE_DAY_MS.day),
  );
  const leftColWidth = 300;
  const chartWidth = Math.max(1200, totalDays * pxPerDay);
  const todayLeft = ((todayTs - timeline.viewportStart) / SCALE_DAY_MS.day) * pxPerDay;

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Диаграмма тендеров (Гант)
          </h1>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Масштаб:</span>
            {(["day", "week", "month"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={`rounded-md px-2 py-1 ${
                  scale === s
                    ? "bg-slate-900 text-amber-300 dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {s === "day" ? "Дни" : s === "week" ? "Недели" : "Месяцы"}
              </button>
            ))}
            <button
              type="button"
              onClick={scrollToToday}
              className="ml-2 rounded-md bg-red-500 px-2 py-1 text-white transition-colors hover:bg-red-600"
            >
              Сегодня
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative flex-1 overflow-auto rounded-xl border border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/80"
      >
        <div style={{ width: leftColWidth + chartWidth }} className="min-h-full">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100/95 dark:border-slate-700 dark:bg-slate-900/95">
            <div className="grid grid-cols-[300px_1fr]">
              <div className="sticky left-0 z-30 border-r border-slate-200 bg-slate-100/95 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300">
                Тендер
              </div>
              <div className="relative h-10">
                {ticks.map((t) => {
                  const left = ((t.ts - timeline.viewportStart) / SCALE_DAY_MS.day) * pxPerDay;
                  return (
                    <div
                      key={t.ts}
                      className="absolute top-0 h-full border-l border-slate-300/70 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400"
                      style={{ left }}
                    >
                      <span className="ml-1">{t.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative">
            {todayLeft >= 0 && todayLeft <= chartWidth && (
              <div
                className="pointer-events-none absolute top-0 z-10 h-full w-[2px] bg-red-500"
                style={{ left: leftColWidth + todayLeft }}
              />
            )}

            {items.map((it) => {
              const startDays = (it.start.getTime() - timeline.viewportStart) / SCALE_DAY_MS.day;
              const endDays = (it.end.getTime() - timeline.viewportStart) / SCALE_DAY_MS.day;
              const left = Math.max(0, startDays * pxPerDay);
              const width = Math.max(8, (endDays - startDays + 1) * pxPerDay);
              const barColor = STATUS_COLORS[it.status] ?? "bg-blue-500/80";
              const futureStartDays =
                (it.futureStart.getTime() - timeline.viewportStart) /
                SCALE_DAY_MS.day;
              const futureEndDays =
                (it.futureEnd.getTime() - timeline.viewportStart) /
                SCALE_DAY_MS.day;
              const futureLeft = Math.max(0, futureStartDays * pxPerDay);
              const futureWidth = Math.max(
                8,
                (futureEndDays - futureStartDays + 1) * pxPerDay,
              );
              const futureBarColor =
                FUTURE_STATUS_COLORS[it.status] ??
                "bg-blue-500/20 border border-dashed border-blue-300/70";

              return (
                <div
                  key={it.id}
                  className="grid grid-cols-[300px_1fr] border-b border-slate-100 dark:border-slate-800"
                >
                  <div className="sticky left-0 z-10 truncate border-r border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                    <button
                      type="button"
                      onClick={() => openTenderCard(it.id)}
                      className="truncate text-left font-medium hover:text-slate-900 dark:hover:text-white"
                      title="Открыть карточку тендера"
                    >
                      {it.client} / {it.project}
                    </button>
                    <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {it.agency} • {it.manager}
                    </div>
                  </div>
                  <div className="relative h-11">
                    <div
                      className={`absolute top-2 h-7 cursor-pointer rounded-md px-2 py-1 text-[10px] font-medium text-white shadow-sm ${barColor}`}
                      style={{ left, width }}
                      title={`${it.client}\n${it.status}\n${it.start.toLocaleDateString()} - ${it.end.toLocaleDateString()}`}
                      onClick={() => openTenderCard(it.id)}
                    >
                      <span className="truncate">{it.status}</span>
                    </div>
                    <div
                      className={`absolute top-2 h-7 cursor-pointer rounded-md px-2 py-1 text-[10px] font-medium text-slate-100 shadow-sm ${futureBarColor}`}
                      style={{ left: futureLeft, width: futureWidth }}
                      onClick={() => openTenderCard(it.id)}
                    >
                      <span className="truncate opacity-80">Будущий</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

