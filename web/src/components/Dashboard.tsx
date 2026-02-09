"use client";

import { useState } from "react";
import { DataTable, DataColumn, DataRow } from "./DataTable";
import { ChatPanel, TableRequest } from "./ChatPanel";

type Props = {
    initialColumns: DataColumn[];
    initialRows: DataRow[];
};

export function Dashboard({ initialColumns, initialRows }: Props) {
    const [activeRequest, setActiveRequest] = useState<TableRequest | null>(null);
    const [currentTable, setCurrentTable] = useState("clients");
    const [columns, setColumns] = useState<DataColumn[]>(initialColumns);
    const [rows, setRows] = useState<DataRow[]>(initialRows);
    const [loading, setLoading] = useState(false);
    const [tableError, setTableError] = useState<string | null>(null);

    // Обработка смены таблицы
    const handleApplyRequest = async (req: TableRequest) => {
        setActiveRequest(req);
        setTableError(null);

        if (req.table && req.table !== currentTable) {
            setLoading(true);
            try {
                const res = await fetch(`/api/data?table=${req.table}`);
                const data = await res.json();
                if (res.ok) {
                    setColumns(data.columns ?? []);
                    setRows(data.rows ?? []);
                    setCurrentTable(req.table);
                    setTableError((data.columns?.length ?? 0) > 0 ? null : (data.error ?? null));
                } else {
                    setTableError(data.error || "Не удалось загрузить данные.");
                }
            } catch (err) {
                console.error("Failed to fetch new table data:", err);
                setTableError("Ошибка сети. Проверьте подключение.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
            {/* Область таблицы */}
            <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                            Таблица данных: {currentTable === "clients" ? "Клиенты" : currentTable === "contacts" ? "Контакты" : "Тендеры"}
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {activeRequest?.description || "Здесь будут результаты запросов к данным клиентов, контактам и тендерам."}
                        </p>
                    </div>
                </header>

                {/* Компонент таблицы с фильтрами/сортировкой/пагинацией */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                            <div
                                className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-slate-700 dark:border-t-amber-400"
                                aria-hidden
                            />
                            <span className="text-xs">Загрузка данных {currentTable}…</span>
                        </div>
                    ) : columns.length > 0 ? (
                        <DataTable
                            columns={columns}
                            rows={rows}
                            activeRequest={activeRequest}
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                            <p>Не удалось загрузить данные из {currentTable}.</p>
                            <p>Проверьте подключение к базе данных (Supabase) и наличие данных в таблице.</p>
                            {tableError && (
                                <p className="mt-2 max-w-md text-red-600 dark:text-red-400">{tableError}</p>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Боковая панель чата ИИ */}
            <ChatPanel onApplyRequest={handleApplyRequest} />
        </div>
    );
}
