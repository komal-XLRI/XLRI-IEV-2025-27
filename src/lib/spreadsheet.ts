import "server-only";
import readXlsxFile from "read-excel-file/node";
import { badRequest } from "@/lib/api";
import { parseDelimited, type ParsedTable } from "@/lib/csv";

const MAX_BYTES = 5 * 1024 * 1024;

const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
]);

export type ReadResult = {
  table: ParsedTable;
  sheets: string[];
  sheet: string | null;
  source: "excel" | "text";
};

/**
 * Turns an uploaded roster or intake sheet into a header row plus data rows.
 *
 * Excel is parsed on the server rather than in the browser: the reader is far
 * too heavy to ship to every admin, and it keeps one code path for .xlsx, .csv
 * and pasted text.
 */
export async function readUploadedTable(file: File, sheetName?: string): Promise<ReadResult> {
  if (file.size === 0) throw badRequest("That file is empty.");
  if (file.size > MAX_BYTES) throw badRequest("Files must be 5 MB or smaller.");

  const name = file.name.toLowerCase();

  // Legacy .xls is a different binary format entirely and is not supported.
  if (name.endsWith(".xls")) {
    throw badRequest(
      "That is the older .xls format. Open it and choose File → Save As → Excel Workbook (.xlsx), then try again.",
    );
  }

  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xlsm") || XLSX_TYPES.has(file.type);
  if (!isExcel) {
    return { table: parseDelimited(await file.text()), sheets: [], sheet: null, source: "text" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // The reader returns every sheet in one pass: [{ sheet, data }, ...]
  let workbook: { sheet: string; data: unknown[][] }[];
  try {
    workbook = (await readXlsxFile(buffer)) as unknown as { sheet: string; data: unknown[][] }[];
  } catch {
    throw badRequest(
      "That file could not be read as an Excel workbook. If it came from another tool, export it as .xlsx or .csv.",
    );
  }

  const sheets = workbook.map((s) => s.sheet);
  if (sheets.length === 0) throw badRequest("That workbook has no sheets.");

  const wanted = sheetName ? workbook.find((s) => s.sheet === sheetName) : undefined;

  // Without an explicit choice, use the first sheet that actually has rows —
  // workbooks often lead with a blank or instructions tab.
  const chosen = wanted ?? workbook.find((s) => s.data.length > 1) ?? workbook[0];

  const asText = chosen.data.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return "";
      if (cell instanceof Date) return cell.toISOString().slice(0, 10);
      return String(cell).trim();
    }),
  );

  const nonEmpty = asText.filter((r) => r.some((c) => c !== ""));
  if (nonEmpty.length === 0) throw badRequest(`Sheet "${chosen.sheet}" is empty.`);

  return {
    table: { headers: nonEmpty[0], rows: nonEmpty.slice(1) },
    sheets,
    sheet: chosen.sheet,
    source: "excel",
  };
}
