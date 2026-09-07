import { badRequest, withRoute } from "@/lib/api";
import { HttpError, requireApiSession } from "@/lib/auth";
import { mapVentureColumns, toVentureRows } from "@/lib/csv";
import { readUploadedTable } from "@/lib/spreadsheet";

export const runtime = "nodejs";

/** Turns an uploaded intake sheet into rows the venture import understands. */
export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);

  const form = await req.formData();
  const file = form.get("file");
  const sheetName = form.get("sheet");

  if (!(file instanceof File)) throw badRequest("Attach a file to import.");

  const { table, sheets, sheet, source } = await readUploadedTable(
    file,
    typeof sheetName === "string" ? sheetName : undefined,
  );

  if (table.headers.length === 0) {
    throw badRequest("No header row was found. The first row should name the columns.");
  }

  const columns = mapVentureColumns(table.headers);

  // A venture must be attachable to a student and must have a name; the rest of
  // the sheet is optional detail.
  const missing: string[] = [];
  if (columns.rollNumber === -1 && columns.email === -1) {
    missing.push("Roll Number or Email I'd");
  }
  if (columns.ventureName === -1) missing.push("Startup/Business Name");

  if (missing.length > 0) {
    const found = table.headers.filter(Boolean).join(", ") || "(none)";
    throw new HttpError(
      422,
      `Could not find ${missing.join(", ")} in the header row. Found: ${found}.` +
        (sheet ? ` Read from sheet "${sheet}".` : ""),
    );
  }

  const rows = toVentureRows(table, columns);
  if (rows.length === 0) throw badRequest("The header row was read, but there are no data rows.");

  return { rows, headers: table.headers, sheets, sheet, source };
});
