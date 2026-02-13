"use client";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
};

export function MetricCard({ title, value, subtitle }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </p>
      {subtitle != null && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
