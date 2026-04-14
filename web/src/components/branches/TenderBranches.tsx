"use client";

import { useEffect, useMemo, useState } from "react";

type DataRow = Record<string, string | number | Date | null>;

type BranchNode = {
  id: string;
  previousId: string;
  client: string;
  project: string;
  tenderStart: string;
  tenderBudget: string;
};

function getStr(row: DataRow, key: string): string {
  const v = row[key] ?? row[key.toLowerCase()];
  if (v == null) return "";
  return String(v).trim();
}

function formatDate(raw: string): string {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("ru-RU");
}

function formatBudget(raw: string): string {
  if (!raw) return "—";
  const normalized = Number(raw.toString().replace(/\s+/g, "").replace(",", "."));
  if (!Number.isFinite(normalized)) return raw;
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(normalized);
}

function rowToNode(row: DataRow): BranchNode | null {
  const id = getStr(row, "id_pf") || getStr(row, "id");
  if (!id) return null;
  return {
    id,
    previousId: getStr(row, "allocates"),
    client: getStr(row, "client") || "—",
    project: getStr(row, "project") || "—",
    tenderStart: getStr(row, "tender_start"),
    tenderBudget: getStr(row, "tender_budget"),
  };
}

function buildBranches(nodes: BranchNode[]): BranchNode[][] {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = new Map<string, BranchNode[]>();

  nodes.forEach((node) => {
    if (!node.previousId || !nodesById.has(node.previousId)) return;
    const list = childrenByParent.get(node.previousId) ?? [];
    list.push(node);
    childrenByParent.set(node.previousId, list);
  });

  const roots = nodes.filter((node) => !node.previousId || !nodesById.has(node.previousId));
  const paths: BranchNode[][] = [];
  const usedIds = new Set<string>();

  const walk = (node: BranchNode, path: BranchNode[]) => {
    const nextPath = [...path, node];
    usedIds.add(node.id);
    const children = childrenByParent.get(node.id) ?? [];
    if (children.length === 0) {
      paths.push(nextPath);
      return;
    }
    children.forEach((child) => walk(child, nextPath));
  };

  roots.forEach((root) => walk(root, []));

  // Fallback для циклов/сирот без корректно определенного root
  nodes.forEach((node) => {
    if (usedIds.has(node.id)) return;
    paths.push([node]);
  });

  return paths
    .filter((path) => {
      if (path.length < 2) return false;
      const uniqueStartDates = new Set(path.map((node) => (node.tenderStart || "").trim()));
      return uniqueStartDates.size > 1;
    })
    .sort((a, b) => {
      const aDate = a[0]?.tenderStart ? new Date(a[0].tenderStart).getTime() : 0;
      const bDate = b[0]?.tenderStart ? new Date(b[0].tenderStart).getTime() : 0;
      return aDate - bDate;
    });
}

export function TenderBranches() {
  const [nodes, setNodes] = useState<BranchNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rowsOnly: true,
        tableRequest: {
          table: "tenders",
          sort: { field: "tender_start", direction: "asc" as const },
          columns: [
            "id",
            "id_pf",
            "client",
            "project",
            "tender_start",
            "tender_budget",
            "allocates",
          ],
        },
      }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setNodes([]);
          setLoading(false);
          return;
        }
        const parsed = (data.rows ?? [])
          .map((row: DataRow) => rowToNode(row))
          .filter((item: BranchNode | null): item is BranchNode => item !== null);
        setNodes(parsed);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Не удалось загрузить ветки тендеров");
        setNodes([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const branches = useMemo(() => buildBranches(nodes), [nodes]);

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

  if (branches.length === 0) {
    return (
      <div className="m-4 rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
        Нет данных для отображения веток.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Ветки тендеров
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Связи строятся по полю allocates (ссылка на id_pf предыдущего тендера)
        </p>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex min-w-max flex-col gap-4">
          {branches.map((branch, branchIdx) => (
            <div
              key={`branch-${branchIdx}-${branch[0]?.id ?? "empty"}`}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40"
            >
              <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Ветка #{branchIdx + 1}
              </p>
              <div className="overflow-x-auto pb-1">
                <div className="flex min-w-max items-stretch gap-0">
                  {branch.map((node, index) => (
                    <div key={node.id} className="flex items-center">
                      <div className="w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {node.client} / {node.project}
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <p>Старт: {formatDate(node.tenderStart)}</p>
                          <p>Бюджет: {formatBudget(node.tenderBudget)}</p>
                        </div>
                        <p className="mt-2 truncate text-[10px] text-slate-400 dark:text-slate-500">
                          ID: {node.id}
                        </p>
                      </div>
                      {index < branch.length - 1 && (
                        <div className="mx-2 h-px w-6 bg-slate-300 dark:bg-slate-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
