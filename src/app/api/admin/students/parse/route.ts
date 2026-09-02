import readXlsxFile from "read-excel-file/node";
import { badRequest, withRoute } from "@/lib/api";
import { HttpError, requireApiSession } from "@/lib/auth";
import { mapColumns, parseDelimited, toImportRows, type ParsedTable } from "@/lib/csv";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
]);

/**
 * Turns an uploaded roster into rows the import endpoint understands.
 *
 * Excel is parsed here rather than in the browser: the reader is far too heavy
 * to ship to every admin, and doing it server-side keeps one code path for
 * .xlsx, .csv and pasted text.
 */
export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);

  const form = await req.formData();
  const file = form.get("file");
  const sheetName = form.get("sheet");

  if (!(file instanceof File)) throw badRequest("Attach a file to import.");
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

  let table: ParsedTable;
  let sheets: string[] = [];
  let usedSheet: string | null = null;

  if (isExcel) {
    const buffer = Buffer.from(await file.arrayBuffer());

    // The reader returns every sheet in one pass: [{ sheet, data }, ...]
    let workbook: { sheet: string; data: unknown[][] }[];
    try {
      workbook = (await readXlsxFile(buffer)) as unknown as {
        sheet: string;
        data: unknown[][];
      }[];
    } catch {
      throw badRequest(
        "That file could not be read as an Excel workbook. If it came from another tool, export it as .xlsx or .csv.",
      );
    }

    sheets = workbook.map((s) => s.sheet);
    if (sheets.length === 0) throw badRequest("That workbook has no sheets.");

    const wanted =
      typeof sheetName === "string" ? workbook.find((s) => s.sheet === sheetName) : undefined;

    // Without an explicit choice, use the first sheet that actually has rows —
    // workbooks often lead with a blank or instructions tab.
    const chosen = wanted ?? workbook.find((s) => s.data.length > 1) ?? workbook[0];
    usedSheet = chosen.sheet;

    const asText = chosen.data.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return "";
        if (cell instanceof Date) return cell.toISOString().slice(0, 10);
        return String(cell).trim();
      }),
    );

    const nonEmpty = asText.filter((r) => r.some((c) => c !== ""));
    if (nonEmpty.length === 0) throw badRequest(`Sheet "${usedSheet}" is empty.`);

    table = { headers: nonEmpty[0], rows: nonEmpty.slice(1) };
  } else {
    const text = await file.text();
    table = parseDelimited(text);
  }

  if (table.headers.length === 0) {
    throw badRequest("No header row was found. The first row should name the columns.");
  }

  const columns = mapColumns(table.headers);
  const missing: string[] = [];
  if (columns.name === -1) missing.push("Full Name");
  if (columns.email === -1) missing.push("Email Id");
  if (columns.rollNumber === -1) missing.push("Roll No");

  if (missing.length > 0) {
    const found = table.headers.filter(Boolean).join(", ") || "(none)";
    throw new HttpError(
      422,
      `Could not find ${missing.join(", ")} in the header row. Found: ${found}.` +
        (usedSheet ? ` Read from sheet "${usedSheet}".` : ""),
    );
  }

  const rows = toImportRows(table, columns);
  if (rows.length === 0) throw badRequest("The header row was read, but there are no data rows.");

  return { rows, headers: table.headers, sheets, sheet: usedSheet, source: isExcel ? "excel" : "text" };
});
