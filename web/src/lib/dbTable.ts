import type { TableResult } from "@/lib/buildTableFromRecords";
import { buildTableFromRecords } from "@/lib/buildTableFromRecords";
import { supabaseServer } from "@/lib/supabaseServer";

const ALLOWED_TABLES = ["clients", "contacts", "tenders"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

export type TableResultWithError = TableResult & { error?: string };

export async function getDbTable(
  tableName: string = "clients",
): Promise<TableResultWithError> {
  if (!supabaseServer) {
    console.warn(
      "[Supabase] Клиент не инициализирован. Вернём пустую таблицу.",
    );
    return {
      columns: [],
      rows: [],
      error: "Supabase не настроен. Проверьте переменные окружения (.env.local).",
    };
  }

  const safeTable: AllowedTable = ALLOWED_TABLES.includes(
    tableName as AllowedTable,
  )
    ? (tableName as AllowedTable)
    : "clients";

  const { data, error } = await supabaseServer
    .from(safeTable)
    .select("*")
    .limit(1000);

  if (error) {
    console.error("[Supabase] Ошибка при запросе таблицы", safeTable, error);
    return {
      columns: [],
      rows: [],
      error: error.message || "Ошибка подключения к базе данных.",
    };
  }

  if (!data || data.length === 0) {
    console.warn(`[Supabase] Таблица ${safeTable} пуста.`);
    return { columns: [], rows: [] };
  }

  // Supabase возвращает массив записей { [column]: value }
  // Преобразуем его в универсальный формат через общий конструктор
  return buildTableFromRecords(
    data as unknown as Record<string, unknown>[],
    1000,
  );
}

