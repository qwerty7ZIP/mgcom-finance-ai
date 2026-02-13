"use client";

import { useState, useRef, useEffect } from "react";
import { TendersSection } from "./TendersSection";
import { ClientsSection } from "./ClientsSection";
import { ContactsSection } from "./ContactsSection";

type Section = "tenders" | "clients" | "contacts";

const sections: { id: Section; label: string }[] = [
  { id: "tenders", label: "Тендеры" },
  { id: "clients", label: "Клиенты" },
  { id: "contacts", label: "Контакты" },
];

const AGENCY_OPTIONS = [
  "MGCom",
  "MGrowth",
  "Артикс",
  "E-Promo",
  "i-Media",
  "AGM",
] as const;

export function AnalyticsDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("tenders");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [agencyDropdownOpen, setAgencyDropdownOpen] = useState(false);
  const agencyDropdownRef = useRef<HTMLDivElement>(null);

  const allAgenciesSelected =
    selectedAgencies.length > 0 &&
    selectedAgencies.length === AGENCY_OPTIONS.length;

  const toggleAgency = (agency: string) => {
    setSelectedAgencies((prev) =>
      prev.includes(agency)
        ? prev.filter((a) => a !== agency)
        : [...prev, agency],
    );
  };

  const handleSelectAllAgencies = () => {
    if (allAgenciesSelected) {
      setSelectedAgencies([]);
    } else {
      setSelectedAgencies([...AGENCY_OPTIONS]);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        agencyDropdownRef.current &&
        !agencyDropdownRef.current.contains(e.target as Node)
      ) {
        setAgencyDropdownOpen(false);
      }
    }
    if (agencyDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [agencyDropdownOpen]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
      {/* Переключатель разделов + фильтр периода для тендеров */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex items-center gap-1">
          {sections.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === id
                  ? "bg-slate-900 text-amber-300 dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeSection === "tenders" && (
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            {/* Фильтр по агентствам — выпадающий список с мультивыбором */}
            <div className="relative" ref={agencyDropdownRef}>
              <span className="hidden sm:mr-1.5 sm:inline text-slate-600 dark:text-slate-300">
                Агентство:
              </span>
              <button
                type="button"
                onClick={() => setAgencyDropdownOpen((v) => !v)}
                className="inline-flex items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="truncate max-w-[140px]">
                  {selectedAgencies.length === 0
                    ? "Все агентства"
                    : selectedAgencies.length === AGENCY_OPTIONS.length
                      ? "Все агентства"
                      : `Агентств: ${selectedAgencies.length}`}
                </span>
                <span
                  className={`shrink-0 text-[10px] text-slate-400 transition-transform ${agencyDropdownOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
              {agencyDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <p className="mb-2 px-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Отметьте агентства:
                  </p>
                  <div className="max-h-52 space-y-0.5 overflow-y-auto px-1">
                    {AGENCY_OPTIONS.map((name) => {
                      const checked = selectedAgencies.includes(name);
                      return (
                        <label
                          key={name}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/70"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAgency(name)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-amber-500 dark:focus:ring-amber-500/50"
                          />
                          <span>{name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-1 border-t border-slate-100 px-2 pt-1.5 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={handleSelectAllAgencies}
                      className="w-full rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      {allAgenciesSelected ? "Сбросить" : "Выбрать все"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Фильтр по периоду */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Период:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-400"
              />
              <span className="text-slate-400">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Контент выбранного раздела */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        {activeSection === "tenders" && (
          <TendersSection
            key={`${dateFrom || "all"}-${dateTo || "all"}-${selectedAgencies.join(",") || "all"}`}
            dateFrom={dateFrom || undefined}
            dateTo={dateTo || undefined}
            agencies={selectedAgencies}
          />
        )}
        {activeSection === "clients" && <ClientsSection />}
        {activeSection === "contacts" && <ContactsSection />}
      </div>
    </div>
  );
}
