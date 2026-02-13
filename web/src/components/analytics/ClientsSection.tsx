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
  Legend,
} from "recharts";
import { MetricCard } from "./MetricCard";

type DataRow = Record<string, string | number | Date | null>;

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

export function ClientsSection() {
  const [clients, setClients] = useState<DataRow[]>([]);
  const [tenders, setTenders] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableRequest: { table: "clients" } }),
      }).then((res) => res.json()),
      fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableRequest: { table: "tenders" } }),
      }).then((res) => res.json()),
    ])
      .then(([clientsData, tendersData]) => {
        if (cancelled) return;
        if (clientsData.error) {
          setError(clientsData.error);
          setClients([]);
          setTenders([]);
          return;
        }
        setError(tendersData.error || null);
        setClients(clientsData.rows ?? []);
        setTenders(tendersData.rows ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить данные");
          setClients([]);
          setTenders([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const top30Count = clients.filter((r) => {
    const v = getStr(r, "top_30");
    return /true|1|да|yes/i.test(v) || v === "1";
  }).length;

  const byCategory: Record<string, number> = {};
  clients.forEach((r) => {
    const cat = getStr(r, "Client_category") || getStr(r, "client_category") || "Без категории";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  });
  const categoryChartData = Object.entries(byCategory).map(([name, value]) => ({
    name,
    value,
  }));

  const byClientBudget: Record<string, number> = {};
  tenders.forEach((r) => {
    const client = getStr(r, "client") || "—";
    byClientBudget[client] = (byClientBudget[client] ?? 0) + getNum(r, "tender_budget");
  });
  const topClients = Object.entries(byClientBudget)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  const totalBudget = tenders.reduce((s, r) => s + getNum(r, "tender_budget"), 0);
  const top30Budget = tenders
    .filter((r) => {
      const client = getStr(r, "client");
      const clientRow = clients.find(
        (c) =>
          getStr(c, "mgc_client") === client || getStr(c, "client") === client
      );
      if (!clientRow) return false;
      const v = getStr(clientRow, "top_30");
      return /true|1|да|yes/i.test(v) || v === "1";
    })
    .reduce((s, r) => s + getNum(r, "tender_budget"), 0);
  const top30Share = totalBudget > 0 ? Math.round((top30Budget / totalBudget) * 100) : 0;

  const formatRub = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)} млн ₽`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)} тыс ₽`
        : `${Math.round(n)} ₽`;

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
        Метрики по клиентам
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Всего клиентов" value={clients.length} />
        <MetricCard
          title="Клиенты из топ‑30"
          value={top30Count}
          subtitle="по признаку в базе"
        />
        <MetricCard
          title="Доля топ‑30 в обороте"
          value={`${top30Share}%`}
          subtitle={formatRub(top30Budget)}
        />
        <MetricCard
          title="Общий оборот по тендерам"
          value={formatRub(totalBudget)}
          subtitle={`по ${tenders.length} тендерам`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {categoryChartData.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Распределение по направлениям (категориям)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {categoryChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {topClients.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Топ‑10 клиентов по обороту (тендеры)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                  <XAxis type="number" tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : `${v / 1e3}K`)} stroke="currentColor" />
                  <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 10 }} stroke="currentColor" />
                  <Tooltip formatter={(v: number) => formatRub(v)} labelStyle={{ color: "#000" }} />
                  <Bar dataKey="value" fill="hsl(142 71% 45%)" name="Оборот" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
