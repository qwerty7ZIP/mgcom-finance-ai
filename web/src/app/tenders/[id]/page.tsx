import { notFound } from "next/navigation";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { getDbTableByRequest } from "@/lib/dbTable";
import { supabaseServer } from "@/lib/supabaseServer";

type Props = {
  params: Promise<{ id: string }>;
};

const ACTIVE_CHANNELS: { label: string; keys: string[] }[] = [
  { label: "Performance", keys: ["performance"] },
  { label: "Context", keys: ["context"] },
  { label: "Target", keys: ["target"] },
  { label: "Media", keys: ["media"] },
  { label: "OLV", keys: ["olv"] },
  { label: "Mobile", keys: ["mobile"] },
  { label: "Programmatic", keys: ["programmatic"] },
  { label: "Marketplace", keys: ["marketplace"] },
  { label: "CPA", keys: ["cpa"] },
  { label: "In-app", keys: ["in-app", "in_app", "inapp"] },
  { label: "ORM", keys: ["orm"] },
  { label: "SEO", keys: ["seo"] },
  { label: "Influence", keys: ["influence"] },
  { label: "Creative", keys: ["creative"] },
];

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (value instanceof Date) return value.toLocaleDateString();
  const s = String(value);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(s)) {
    return d.toLocaleDateString();
  }
  return s;
}

export default async function TenderCardPage({ params }: Props) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const byPlanfixId = await getDbTableByRequest({
    table: "tenders",
    filters: [{ field: "id_pf", operator: "eq", value: decodedId }],
    limit: 1,
  });

  const byInternalId =
    byPlanfixId.rows?.length
      ? byPlanfixId
      : await getDbTableByRequest({
          table: "tenders",
          filters: [{ field: "id", operator: "eq", value: decodedId }],
          limit: 1,
        });

  if (byInternalId.error) {
    return (
      <ProtectedLayout>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            {byInternalId.error}
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  const row = byInternalId.rows?.[0];
  if (!row) {
    notFound();
  }

  const planfixIdRaw = row["id_pf"] ?? row["ID_PF"] ?? row["id_pf".toLowerCase()];
  const planfixId = planfixIdRaw == null ? "" : String(planfixIdRaw).trim();
  const planfixUrl = planfixId
    ? `https://pf.mgcom.ru/task/${encodeURIComponent(planfixId)}`
    : "";
  const client = formatValue(row["client"] ?? row["CLIENT"] ?? row["Client"]);
  const project = formatValue(row["project"] ?? row["PROJECT"] ?? row["Project"]);
  const title = `${client} / ${project}`;
  const clientRaw = String(
    row["client"] ?? row["CLIENT"] ?? row["Client"] ?? "",
  ).trim();

  let activeAgency: string | null = null;
  let activeChannels: string[] = [];
  if (supabaseServer && clientRaw) {
    try {
      const { data } = await supabaseServer
        .from("active_list")
        .select("*")
        .eq("client", clientRaw)
        .eq("active", true)
        .limit(1);
      const activeRow = data?.[0] as Record<string, unknown> | undefined;
      const agencyValue = activeRow?.agency;
      activeAgency = agencyValue ? String(agencyValue).trim() : null;
      if (activeRow) {
        activeChannels = ACTIVE_CHANNELS.filter(({ keys }) =>
          keys.some((k) => activeRow[k] === true),
        ).map(({ label }) => label);
      }
    } catch {
      activeAgency = null;
      activeChannels = [];
    }
  }

  return (
    <ProtectedLayout>
      <div className="flex flex-1 flex-col overflow-auto px-4 py-4 lg:px-6 lg:py-5">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-5 flex items-start justify-between gap-3">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h1>
            {(activeAgency || activeChannels.length > 0) && (
              <div className="flex max-w-[65%] flex-wrap justify-end gap-2">
                {activeAgency && (
                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-200">
                    Активный клиент {activeAgency}
                  </span>
                )}
                {activeChannels.map((channel) => (
                  <span
                    key={channel}
                    className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-700/60 dark:bg-sky-900/30 dark:text-sky-200"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            )}
          </div>
          {planfixId && (
            <a
              href={planfixUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-5 inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Посмотреть в Планфикс
            </a>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {byInternalId.columns
              .filter((c) => !c.hidden && c.key.toLowerCase() !== "id_pf")
              .map((col) => (
                <div
                  key={col.key}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {col.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {formatValue(row[col.key])}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

