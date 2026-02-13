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
const SUPABASE_PAGE_SIZE = 1000;

type SupabaseQuery = ReturnType<NonNullable<typeof supabaseServer>["from"]>;

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

async function fetchAllRows(
  baseQuery: SupabaseQuery,
  requestedLimit: number,
): Promise<Record<string, unknown>[]> {
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;

  while (offset < requestedLimit) {
    const pageSize = Math.min(SUPABASE_PAGE_SIZE, requestedLimit - offset);
    const { data, error } = await baseQuery.range(
      offset,
      offset + pageSize - 1,
    );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...(data as unknown as Record<string, unknown>[]));

    if (data.length < pageSize) {
      break;
    }

    offset += data.length;
  }

  return allRows;
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

  try {
    const baseQuery = supabaseServer.from(safeTable).select("*");
    const rows = await fetchAllRows(baseQuery, DEFAULT_LIMIT);

    if (!rows || rows.length === 0) {
      console.warn(`[Supabase] Таблица ${safeTable} пуста.`);
      return { columns: [], rows: [] };
    }

    // Supabase возвращает массив записей { [column]: value }
    // Преобразуем его в универсальный формат через общий конструктор
    return buildTableFromRecords(rows, DEFAULT_LIMIT);
  } catch (error) {
    console.error("[Supabase] Ошибка при запросе таблицы", safeTable, error);
    return {
      columns: [],
      rows: [],
      error:
        (error instanceof Error && error.message) ||
        "Ошибка подключения к базе данных.",
    };
  }
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

    if (op === "in") {
      const arr = Array.isArray(rawVal) ? rawVal : [rawVal];
      if (arr.length > 0) {
        query = query.in(field, arr as any);
      }
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
    const dir =
      (request.sort.direction || "asc").toLowerCase() === "desc"
        ? "desc"
        : "asc";
    if (sortField) {
      query = query.order(sortField, { ascending: dir === "asc" });
    }
  }

  try {
    const rows = await fetchAllRows(query, requestedLimit);

    if (!rows || rows.length === 0) {
      console.warn(
        `[Supabase] Таблица ${safeTable} пуста или фильтр не дал результатов.`,
      );
      return { columns: [], rows: [] };
    }

    return buildTableFromRecords(rows, requestedLimit);
  } catch (error) {
    console.error("[Supabase] Ошибка при запросе таблицы", safeTable, error);
    return {
      columns: [],
      rows: [],
      error:
        (error instanceof Error && error.message) ||
        "Ошибка подключения к базе данных.",
    };
  }
}

