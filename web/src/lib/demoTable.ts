import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import type { DataColumn, DataRow } from "@/components/DataTable";

type DemoTableResult = {
  columns: DataColumn[];
  rows: DataRow[];
};

/**
 * Временная функция для получения демонстрационной таблицы
 * из Excel-файла в папке data-files.
 *
 * Для MVP:
 * - Берём первый лист файла `клиенты-ai.xlsx`;
 * - Первая строка — заголовки колонок;
 * - Пытаемся определить типы колонок по первым значениям;
 * - Ограничиваемся первыми 200 строками для UI.
 */
export async function getDemoTable(): Promise<DemoTableResult> {
  const excelPath = path.join(
    process.cwd(),
    "..",
    "data-files",
    "клиенты-ai.xlsx",
  );

  if (!fs.existsSync(excelPath)) {
    // Fallback: пустая структура, фронт может показать сообщение
    return { columns: [], rows: [] };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = fs.readFileSync(excelPath);
    workbook = XLSX.read(buffer, { type: "buffer" });
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

      // Базовая попытка понять дату
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

      // Можно добавить распознавание дат по шаблону, но для MVP достаточно
    }

    return {
      key,
      label,
      type: detectedType,
    };
  });

  const rows: DataRow[] = json.slice(0, 200).map((row) => {
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

