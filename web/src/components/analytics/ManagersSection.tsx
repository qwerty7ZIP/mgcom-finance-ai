"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "./MetricCard";

type DataRow = Record<string, string | number | Date | null>;
type TableFilter = {
  field: string;
  operator: string;
  value: string;
};

const MGCOM_AGENCY = "MGCom";

const WON_STATUSES = new Set(["Выигран тендер", "Размещается"]);
const LOST_STATUS = "Проигран тендер";
const IN_PROGRESS_STATUS = "Размещается";

const INACTIVE_STATUSES = new Set([
  "Размещается",
  "Не участвовали",
  "Выигран тендер",
  "Отмененная",
  "Завершенная",
  "Проигран тендер",
]);

const NOT_OCCURRED_STATUSES = new Set(["Отмененная", "Не участвовали"]);
const LOST_COLOR = "hsl(0 84% 60%)";
const WON_COLOR = "hsl(142 71% 45%)";

function getNum(row: DataRow, key: string): number {
  const v = row[key] ?? row[key.toLowerCase()];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function getStr(row: DataRow, key: string): string {
  const v = row[key] ?? row[key.toLowerCase()];
  if (v == null) return "";
  return String(v).trim();
}

function getDate(row: DataRow, key: string): Date | null {
  const v = row[key] ?? row[key.toLowerCase()];
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

type Props = {
  manager?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function ManagersSection({ manager, dateFrom, dateTo }: Props) {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const filters: TableFilter[] = [
      { field: "agency", operator: "eq", value: MGCOM_AGENCY },
    ];

    if (dateFrom) {
      filters.push({ field: "tender_start", operator: "gte", value: dateFrom });
    }
    if (dateTo) {
      filters.push({ field: "tender_start", operator: "lte", value: dateTo });
    }

    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableRequest: { table: "tenders", filters } }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setRows([]);
        } else {
          setError(null);
          setRows(data.rows ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить данные");
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  const rowsMgcomPeriod = rows;

  const rowsManager = useMemo(() => {
    if (!manager) return [];
    return rowsMgcomPeriod.filter(
      (r) => getStr(r, "manager") === manager,
    );
  }, [rowsMgcomPeriod, manager]);

  const totalBudgetMgcom = useMemo(
    () =>
      rowsMgcomPeriod.reduce((s, r) => s + getNum(r, "tender_budget"), 0),
    [rowsMgcomPeriod],
  );

  const metrics = useMemo(() => {
    const totalCount = rowsManager.length;

    let activeCount = 0;
    let wonCount = 0;
    let lostCount = 0;
    let inProgressCount = 0;
    let notOccurredCount = 0;

    let totalBudget = 0;
    let wonBudget = 0;

    for (const r of rowsManager) {
      const status = getStr(r, "tender_status");

      if (!INACTIVE_STATUSES.has(status)) activeCount += 1;

      if (WON_STATUSES.has(status)) wonCount += 1;
      if (status === LOST_STATUS) lostCount += 1;
      if (status === IN_PROGRESS_STATUS) inProgressCount += 1;
      if (NOT_OCCURRED_STATUSES.has(status)) notOccurredCount += 1;

      const b = getNum(r, "tender_budget");
      totalBudget += b;
      if (WON_STATUSES.has(status)) wonBudget += b;
    }

    const winRateDen = wonCount + lostCount;
    const winRate =
      wonCount + inProgressCount + lostCount > 0
        ? Math.round(
            ((wonCount + inProgressCount) /
              (wonCount + inProgressCount + lostCount)) *
              100,
          )
        : 0;

    const wonBudgetPctOfManager =
      totalBudget > 0 ? Math.round((wonBudget / totalBudget) * 100) : 0;
    const wonBudgetPctOfMgcom =
      totalBudgetMgcom > 0 ? Math.round((wonBudget / totalBudgetMgcom) * 100) : 0;

    const notOccurredPct =
      totalCount > 0 ? Math.round((notOccurredCount / totalCount) * 100) : 0;

    return {
      totalCount,
      activeCount,
      wonCount,
      lostCount,
      winRate,
      notOccurredCount,
      notOccurredPct,
      totalBudget,
      wonBudget,
      wonBudgetPctOfManager,
      wonBudgetPctOfMgcom,
    };
  }, [rowsManager, totalBudgetMgcom]);

  const formatRub = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)} млн ₽`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)} тыс ₽`
        : `${Math.round(n)} ₽`;

  const monthChartData = useMemo(() => {
    const byMonth: Record<string, { won: number; lost: number }> = {};
    for (const r of rowsManager) {
      const d = getDate(r, "tender_start");
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { won: 0, lost: 0 };
      const status = getStr(r, "tender_status");
      const b = getNum(r, "tender_budget");
      if (WON_STATUSES.has(status)) byMonth[key].won += b;
      if (status === LOST_STATUS) byMonth[key].lost += b;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, v]) => ({
        name,
        won: Math.round(v.won),
        lost: Math.round(v.lost),
      }));
  }, [rowsManager]);

  const topClients = useMemo(() => {
    const byClient: Record<string, { won: number; lost: number }> = {};
    for (const r of rowsManager) {
      const client = getStr(r, "client") || "—";
      if (!byClient[client]) byClient[client] = { won: 0, lost: 0 };
      const status = getStr(r, "tender_status");
      const b = getNum(r, "tender_budget");
      if (WON_STATUSES.has(status)) byClient[client].won += b;
      if (status === LOST_STATUS) byClient[client].lost += b;
    }
    return Object.entries(byClient)
      .sort((a, b) => b[1].won + b[1].lost - (a[1].won + a[1].lost))
      .slice(0, 10)
      .map(([name, v]) => ({
        name,
        won: Math.round(v.won),
        lost: Math.round(v.lost),
      }));
  }, [rowsManager]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-slate-700 dark:border-t-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        Выберите NB менеджера
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Метрики по менеджеру
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {manager} • Агентство {MGCOM_AGENCY}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Тендеров" value={metrics.totalCount} />
        <MetricCard title="Активных" value={metrics.activeCount} />
        <MetricCard title="Выиграно" value={metrics.wonCount} />
        <MetricCard title="Проиграно" value={metrics.lostCount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Конверсия (win rate)" value={`${metrics.winRate}%`} />
        <MetricCard title="Бюджет (все)" value={formatRub(metrics.totalBudget)} />
        <MetricCard title="Бюджет выигранных" value={formatRub(metrics.wonBudget)} />
        <MetricCard
          title="% бюджета выигранных"
          value={`${metrics.wonBudgetPctOfManager}%`}
          subtitle="к бюджету менеджера"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Тендер не состоялся" value={metrics.notOccurredCount} />
        <MetricCard
          title="% тендеров не состоялось"
          value={`${metrics.notOccurredPct}%`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="% бюджета выигранных"
          value={`${metrics.wonBudgetPctOfMgcom}%`}
          subtitle={`к бюджету MGCom за период`}
        />
      </div>

      {monthChartData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Динамика по месяцам (бюджет)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200 dark:stroke-slate-600"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  tickFormatter={(v) =>
                    v >= 1e6 ? `${v / 1e6}M` : `${v / 1e3}K`
                  }
                />
                <Tooltip
                  formatter={(v, n) => [
                    formatRub(typeof v === "number" ? v : 0),
                    n === "won" ? "Выиграно" : "Проиграно",
                  ]}
                  labelStyle={{ color: "#000" }}
                />
                <Line
                  type="monotone"
                  dataKey="won"
                  stroke={WON_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Выиграно"
                />
                <Line
                  type="monotone"
                  dataKey="lost"
                  stroke={LOST_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Проиграно"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {topClients.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Топ‑10 клиентов по бюджету тендеров
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClients} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200 dark:stroke-slate-600"
                />
                <XAxis
                  type="number"
                  tickFormatter={(v) =>
                    v >= 1e6 ? `${v / 1e6}M` : `${v / 1e3}K`
                  }
                  stroke="currentColor"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={75}
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                />
                <Tooltip
                  formatter={(v, n) => [
                    formatRub(typeof v === "number" ? v : 0),
                    n === "won" ? "Выиграно" : "Проиграно",
                  ]}
                  labelStyle={{ color: "#000" }}
                />
                <Bar
                  dataKey="won"
                  stackId="budget"
                  fill={WON_COLOR}
                  name="Выиграно"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="lost"
                  stackId="budget"
                  fill={LOST_COLOR}
                  name="Проиграно"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

