import type { DataColumn, DataRow } from "@/components/DataTable";

export type TableResult = {
  columns: DataColumn[];
  rows: DataRow[];
};

const HIDDEN_SYSTEM_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "inserted_at",
]);

/**
 * Универсальный конструктор табличных данных из массива объектов.
 * Используется и для Excel-файлов, и для данных из БД.
 */
export function buildTableFromRecords(
  records: Record<string, unknown>[],
  limit: number = 1000,
): TableResult {
  if (!records.length) {
    return { columns: [], rows: [] };
  }

  const sampleRow = records[0];
  const keys = Object.keys(sampleRow);

  const columns: DataColumn[] = keys.map((key) => {
    const label = String(key);
    const lowKey = key.toLowerCase();
    const hidden = HIDDEN_SYSTEM_KEYS.has(lowKey);

    // Определяем тип по первым ненулевым значениям
    let detectedType: DataColumn["type"] = "string";
    for (const row of records) {
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

      // Попытка распознать дату в строке (Supabase обычно возвращает ISO-строки)
      const looksLikeDate =
        /\d{4}-\d{2}-\d{2}/.test(str) && !Number.isNaN(Date.parse(str));
      if (looksLikeDate) {
        detectedType = "date";
        break;
      }

      // Если это не дата, пробуем распознать число
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
      hidden,
    };
  });

  const rows: DataRow[] = records.slice(0, limit).map((row) => {
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

