import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import type { DataColumn, DataRow } from "@/components/DataTable";

type DemoTableResult = {
  columns: DataColumn[];
  rows: DataRow[];
};

const TABLE_FILES: Record<string, string> = {
  clients: "клиенты-ai.xlsx",
  contacts: "Контакты-ai.xlsx",
  tenders: "NewBiz - Все тендеры.xlsx",
};

export async function getDemoTable(tableName: string = "clients"): Promise<DemoTableResult> {
  const fileName = TABLE_FILES[tableName] || TABLE_FILES.clients;
  const excelPath = path.join(
    process.cwd(),
    "..",
    "data-files",
    fileName,
  );

  if (!fs.existsSync(excelPath)) {
    console.warn("Файл не найден:", excelPath);
    return { columns: [], rows: [] };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = fs.readFileSync(excelPath);
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (error) {
    console.error("Не удалось прочитать Excel-файл:", excelPath, error);
    return { columns: [], rows: [] };
  }
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
  });

  if (json.length === 0) {
    return { columns: [], rows: [] };
  }

  const sampleRow = json[0];
  const keys = Object.keys(sampleRow);

  const columns: DataColumn[] = keys.map((key) => {
    const label = String(key);

    // Определяем тип по первым ненулевым значениям
    let detectedType: DataColumn["type"] = "string";
    for (const row of json) {
      const value = row[key];
      if (value == null) continue;

      if (typeof value === "number") {
        detectedType = "number";
        break;
      }

      if (value instanceof Date) {
        detectedType = "date";
        break;
      }

      const str = String(value);
      const maybeNumber = Number(str.replace(/\s/g, "").replace(",", "."));
      if (!Number.isNaN(maybeNumber) && str.match(/^\d/)) {
        detectedType = "number";
        break;
      }
    }

    return {
      key,
      label,
      type: detectedType,
    };
  });

  const rows: DataRow[] = json.slice(0, 1000).map((row) => {
    const result: DataRow = {};
    keys.forEach((key) => {
      const value = row[key];
      if (value instanceof Date) {
        result[key] = value;
      } else if (typeof value === "number" || typeof value === "string") {
        result[key] = value;
      } else if (value == null) {
        result[key] = null;
      } else {
        result[key] = String(value);
      }
    });
    return result;
  });

  return { columns, rows };
}

