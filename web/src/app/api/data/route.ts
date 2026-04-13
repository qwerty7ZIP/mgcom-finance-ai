import { NextResponse } from "next/server";
import { getDbRowsByRequest, getDbTable, getDbTableByRequest } from "@/lib/dbTable";

const TENDERS_ROWS_CACHE_TTL_MS = (() => {
  const raw = Number(process.env.TENDERS_CACHE_TTL_MS ?? 300_000);
  if (!Number.isFinite(raw) || raw <= 0) return 300_000;
  return raw;
})();

let tendersRowsCache:
  | {
      key: string;
      expiresAt: number;
      payload: unknown;
    }
  | null = null;

function isTendersRowsOnlyRequest(
  body: { rowsOnly?: boolean; tableRequest?: { table?: string } } | null,
  tableRequest: { table?: string } | null,
) {
  const rowsOnly = body?.rowsOnly === true || (tableRequest as any)?.rowsOnly === true;
  return rowsOnly && tableRequest?.table === "tenders";
}

function buildCacheKey(tableRequest: unknown): string {
  return JSON.stringify(tableRequest ?? {});
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table") || "clients";

  try {
    const data = await getDbTable(table);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching table data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          tableRequest?: any;
          table?: string;
          filters?: any;
          sort?: any;
          limit?: any;
          rowsOnly?: boolean;
        }
      | null;

    const tableRequest = body?.tableRequest ?? body ?? {};
    if (isTendersRowsOnlyRequest(body, tableRequest)) {
      const key = buildCacheKey(tableRequest);
      const now = Date.now();
      if (
        tendersRowsCache &&
        tendersRowsCache.key === key &&
        tendersRowsCache.expiresAt > now
      ) {
        return NextResponse.json(tendersRowsCache.payload);
      }
    }
    const rowsOnly =
      body?.rowsOnly === true || tableRequest?.rowsOnly === true;
    const data = rowsOnly
      ? await getDbRowsByRequest(tableRequest)
      : await getDbTableByRequest(tableRequest);

    if (isTendersRowsOnlyRequest(body, tableRequest) && !(data as any)?.error) {
      tendersRowsCache = {
        key: buildCacheKey(tableRequest),
        expiresAt: Date.now() + TENDERS_ROWS_CACHE_TTL_MS,
        payload: data,
      };
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching table data (POST):", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
