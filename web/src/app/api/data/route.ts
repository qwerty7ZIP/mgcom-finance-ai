import { NextResponse } from "next/server";
import { getDbRowsByRequest, getDbTable, getDbTableByRequest } from "@/lib/dbTable";

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
    const rowsOnly =
      body?.rowsOnly === true || tableRequest?.rowsOnly === true;
    const data = rowsOnly
      ? await getDbRowsByRequest(tableRequest)
      : await getDbTableByRequest(tableRequest);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching table data (POST):", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
