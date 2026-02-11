import type { TableResult } from "@/lib/buildTableFromRecords";
import { buildTableFromRecords } from "@/lib/buildTableFromRecords";
import { supabaseServer } from "@/lib/supabaseServer";

const ALLOWED_TABLES = ["clients", "contacts", "tenders"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

export type TableResultWithError = TableResult & { error?: string };

export type TableFilter = {
  field: string;
  operator: string;
  value: unknown;
};

export type TableSort = {
  field: string;
  direction?: "asc" | "desc";
};

export type TableRequestLike = {
  table?: string;
  filters?: TableFilter[];
  sort?: TableSort | null;
  limit?: number;
};

const DEFAULT_LIMIT = 15000;

function normalizeStringValue(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (
    (s.startsWith("\"") && s.endsWith("\"") && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function buildIlikePattern(value: string): string {
  const v = value.trim();
  if (!v) return "";
  // Если пользователь/модель уже прислали паттерн (% или _), используем как есть.
  if (v.includes("%") || v.includes("_")) return v;
  // Иначе делаем "contains" по умолчанию (как ILIKE '%value%')
  return `%${v}%`;
}

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
    .limit(DEFAULT_LIMIT);

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
    DEFAULT_LIMIT,
  );
}

export async function getDbTableByRequest(
  request: TableRequestLike,
): Promise<TableResultWithError> {
  const tableName = request.table || "clients";

  if (!supabaseServer) {
    console.warn("[Supabase] Клиент не инициализирован. Вернём пустую таблицу.");
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

  const requestedLimit =
    typeof request.limit === "number" && request.limit > 0
      ? Math.min(request.limit, DEFAULT_LIMIT)
      : DEFAULT_LIMIT;

  let query = supabaseServer.from(safeTable).select("*");

  // Применяем фильтры на стороне Supabase (в т.ч. ilike)
  const filters = Array.isArray(request.filters) ? request.filters : [];
  for (const f of filters) {
    const field = normalizeStringValue(f.field);
    const op = normalizeStringValue(f.operator).toLowerCase();
    const rawVal = f.value;

    if (!field || !op) continue;

    if (op === "eq") {
      query = query.eq(field, rawVal as any);
      continue;
    }

    if (op === "ilike" || op === "contains") {
      const v = normalizeStringValue(rawVal);
      const pattern = buildIlikePattern(v);
      if (!pattern) continue;
      query = query.ilike(field, pattern);
      continue;
    }

    if (op === "gte") {
      query = query.gte(field, rawVal as any);
      continue;
    }
    if (op === "lte") {
      query = query.lte(field, rawVal as any);
      continue;
    }
    if (op === "gt") {
      query = query.gt(field, rawVal as any);
      continue;
    }
    if (op === "lt") {
      query = query.lt(field, rawVal as any);
      continue;
    }
  }

  // Сортировка на стороне Supabase (если задана)
  if (request.sort?.field) {
    const sortField = normalizeStringValue(request.sort.field);
    const dir = (request.sort.direction || "asc").toLowerCase() === "desc"
      ? "desc"
      : "asc";
    if (sortField) {
      query = query.order(sortField, { ascending: dir === "asc" });
    }
  }

  const { data, error } = await query.limit(requestedLimit);

  if (error) {
    console.error("[Supabase] Ошибка при запросе таблицы", safeTable, error);
    return {
      columns: [],
      rows: [],
      error: error.message || "Ошибка подключения к базе данных.",
    };
  }

  if (!data || data.length === 0) {
    console.warn(`[Supabase] Таблица ${safeTable} пуста или фильтр не дал результатов.`);
    return { columns: [], rows: [] };
  }

  return buildTableFromRecords(
    data as unknown as Record<string, unknown>[],
    requestedLimit,
  );
}

