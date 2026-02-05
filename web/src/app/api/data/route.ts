import { NextResponse } from "next/server";
import { getDemoTable } from "@/lib/demoTable";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table") || "clients";

    try {
        const data = await getDemoTable(table);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching table data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
