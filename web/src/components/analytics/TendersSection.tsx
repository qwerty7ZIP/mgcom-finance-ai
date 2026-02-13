"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { MetricCard } from "./MetricCard";

type DataRow = Record<string, string | number | Date | null>;
type TableFilter = {
  field: string;
  operator: string;
  value: string;
};

const CHART_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(330 81% 60%)",
  "hsl(262 83% 58%)",
  "hsl(199 89% 48%)",
];

function getNum(row: DataRow, key: string): number {
  const v = row[key] ?? row[key.toLowerCase()];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function getStr(row: DataRow, key: string): string {
  const v = row[key] ?? row[key.toLowerCase()];
  if (v == null) return "";
  return String(v).trim() || "—";
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
  dateFrom?: string;
  dateTo?: string;
  agencies?: string[];
};

export function TendersSection({ dateFrom, dateTo, agencies }: Props) {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const filters: TableFilter[] = [];
    if (dateFrom) {
      filters.push({
        field: "tender_start",
        operator: "gte",
        value: dateFrom,
      });
    }
    if (dateTo) {
      filters.push({
        field: "tender_start",
        operator: "lte",
        value: dateTo,
      });
    }

    const tableRequest: {
      table: "tenders";
      limit?: number;
      filters?: TableFilter[];
    } = {
      table: "tenders",
    };

    if (filters.length > 0) {
      tableRequest.filters = filters;
    }

    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableRequest }),
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

  const filteredRows =
    agencies && agencies.length > 0
      ? rows.filter((r) => {
          const agency = getStr(r, "agency");
          return agencies.includes(agency);
        })
      : rows;

  const totalBudget = filteredRows.reduce(
    (s, r) => s + getNum(r, "tender_budget"),
    0,
  );
  const avgBudget = filteredRows.length ? totalBudget / filteredRows.length : 0;
  // Win rate = (выигранные + размещается) / (выигранные + проигранные + размещается)
  const countByStatus = (statusSubstring: string) =>
    filteredRows.filter((r) =>
      getStr(r, "tender_status").toLowerCase().includes(statusSubstring.toLowerCase())
    ).length;
  const wonCount = countByStatus("Выигран тендер");
  const lostCount = countByStatus("Проигран тендер");
  const inProgressCount = countByStatus("Размещается");
  const winRateDenominator = wonCount + lostCount + inProgressCount;
  const winRate =
    winRateDenominator > 0
      ? Math.round(((wonCount + inProgressCount) / winRateDenominator) * 100)
      : 0;

  const byStatus: Record<string, { sum: number; count: number }> = {};
  filteredRows.forEach((r) => {
    const status = getStr(r, "tender_status") || "Без статуса";
    if (!byStatus[status]) byStatus[status] = { sum: 0, count: 0 };
    byStatus[status].sum += getNum(r, "tender_budget");
    byStatus[status].count += 1;
  });
  const statusChartData = Object.entries(byStatus).map(([name, { sum }]) => ({
    name,
    value: Math.round(sum),
  }));

  const byClient: Record<string, number> = {};
  filteredRows.forEach((r) => {
    const client = getStr(r, "client") || "—";
    byClient[client] = (byClient[client] ?? 0) + getNum(r, "tender_budget");
  });
  const topClients = Object.entries(byClient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  const byMonth: Record<string, { sum: number; count: number }> = {};
  filteredRows.forEach((r) => {
    const d = getDate(r, "tender_start");
    const key = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : "—";
    if (!byMonth[key]) byMonth[key] = { sum: 0, count: 0 };
    byMonth[key].sum += getNum(r, "tender_budget");
    byMonth[key].count += 1;
  });
  const monthChartData = Object.entries(byMonth)
    .filter(([k]) => k !== "—")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, { sum }]) => ({ name, value: Math.round(sum) }));

  const formatRub = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)} млн ₽`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)} тыс ₽`
        : `${Math.round(n)} ₽`;

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
        Метрики по тендерам
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Объём тендеров"
          value={formatRub(totalBudget)}
          subtitle={`${filteredRows.length} записей`}
        />
        <MetricCard
          title="Средний бюджет тендера"
          value={formatRub(avgBudget)}
        />
        <MetricCard title="Конверсия (win rate)" value={`${winRate}%`} />
        <MetricCard title="Всего тендеров" value={filteredRows.length} />
      </div>

      {monthChartData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Динамика по месяцам (бюджет)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : `${v / 1e3}K`)} />
                <Tooltip formatter={(v: number) => [formatRub(v), "Бюджет"]} labelStyle={{ color: "#000" }} />
                <Line type="monotone" dataKey="value" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3 }} name="Бюджет" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {statusChartData.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Структура по статусам (бюджет)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {statusChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatRub(v)} />
                </PieChart>
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
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                  <XAxis type="number" tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : `${v / 1e3}K`)} stroke="currentColor" />
                  <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 10 }} stroke="currentColor" />
                  <Tooltip formatter={(v: number) => formatRub(v)} labelStyle={{ color: "#000" }} />
                  <Bar dataKey="value" fill="hsl(217 91% 60%)" name="Бюджет" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
