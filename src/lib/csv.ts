/**
 * Minimal delimited-text parser for the student import.
 *
 * Handles both a saved CSV and a block pasted straight out of Google Sheets
 * (which arrives tab-separated), including quoted fields containing the
 * delimiter, escaped quotes, and embedded newlines.
 */

export type ParsedTable = { headers: string[]; rows: string[][] };

/** Picks whichever delimiter appears more often outside quotes on line one. */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  if (tabs >= commas && tabs >= semis && tabs > 0) return "\t";
  if (semis > commas) return ";";
  return ",";
}

export function parseDelimited(input: string): ParsedTable {
  const text = input.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const cleaned = rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));

  if (cleaned.length === 0) return { headers: [], rows: [] };

  return { headers: cleaned[0], rows: cleaned.slice(1) };
}

/* ───────────────────────── column matching ───────────────────────── */

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Header spellings seen in the IEV sheets, most specific first. */
const COLUMN_ALIASES = {
  name: ["fullname", "name", "studentname", "student"],
  email: ["emailid", "email", "emailaddress", "mail", "institutemail", "instituteemail"],
  rollNumber: ["rollno", "rollnumber", "roll", "rollid", "registrationno", "regno"],
  batch: ["batch", "batchyear", "year"],
} as const;

export type ColumnMap = { name: number; email: number; rollNumber: number; batch: number };

/**
 * Locates each needed column by header name. Returns -1 for anything absent,
 * so the caller can report precisely what is missing rather than failing on
 * the first bad row.
 */
export function mapColumns(headers: string[]): ColumnMap {
  const normalized = headers.map(norm);
  const find = (aliases: readonly string[]) => {
    for (const alias of aliases) {
      const exact = normalized.indexOf(alias);
      if (exact !== -1) return exact;
    }
    // Fall back to a containment match ("student email id" → email)
    for (const alias of aliases) {
      const partial = normalized.findIndex((h) => h.includes(alias));
      if (partial !== -1) return partial;
    }
    return -1;
  };

  return {
    name: find(COLUMN_ALIASES.name),
    email: find(COLUMN_ALIASES.email),
    rollNumber: find(COLUMN_ALIASES.rollNumber),
    batch: find(COLUMN_ALIASES.batch),
  };
}

/* ─────────────────────────── venture intake sheet ────────────────────────── */

/**
 * Header spellings on the venture intake sheet. The student columns identify
 * who the venture belongs to; the rest are the venture's own fields.
 *
 * Order matters: "startupbusinessname" is tried before "startupbusinesssectors"
 * would match on a containment check, and the sector aliases avoid the bare
 * word "startup" for the same reason.
 */
const VENTURE_ALIASES = {
  name: ["studentname", "fullname", "name", "student"],
  email: ["emailid", "emailld", "email", "emailaddress", "mail"],
  rollNumber: ["rollnumber", "rollno", "roll", "regno", "registrationno"],
  ventureName: ["startupbusinessname", "venturename", "businessname", "startupname", "venture"],
  industry: ["startupbusinesssectors", "startupbusinesssector", "sectors", "sector", "industry"],
  currentStage: ["currentstage", "stage"],
  bottlenecks: ["bottlenecksconstraints", "bottlenecks", "constraints", "challenges"],
  resources: ["resourcethatyouhave", "resourcesthatyouhave", "resourcesyouhave", "resources", "resource"],
  guidance: [
    "guidancethatyouneedfromus",
    "guidanceyouneed",
    "guidanceneeded",
    "guidance",
    "supportneeded",
  ],
} as const;

export type VentureColumnMap = Record<keyof typeof VENTURE_ALIASES, number>;

export type VentureImportRow = {
  line: number;
  name: string;
  email: string;
  rollNumber: string;
  ventureName: string;
  industry: string;
  currentStage: string;
  bottlenecks: string;
  resources: string;
  guidance: string;
};

/** Locates each venture column by header name; -1 for anything absent. */
export function mapVentureColumns(headers: string[]): VentureColumnMap {
  const normalized = headers.map(norm);
  const taken = new Set<number>();

  const find = (aliases: readonly string[]) => {
    for (const alias of aliases) {
      const exact = normalized.indexOf(alias);
      if (exact !== -1 && !taken.has(exact)) {
        taken.add(exact);
        return exact;
      }
    }
    for (const alias of aliases) {
      const partial = normalized.findIndex((h, i) => !taken.has(i) && h.includes(alias));
      if (partial !== -1) {
        taken.add(partial);
        return partial;
      }
    }
    return -1;
  };

  // Resolved in this order so a more specific header claims its column first.
  return {
    rollNumber: find(VENTURE_ALIASES.rollNumber),
    email: find(VENTURE_ALIASES.email),
    name: find(VENTURE_ALIASES.name),
    ventureName: find(VENTURE_ALIASES.ventureName),
    industry: find(VENTURE_ALIASES.industry),
    currentStage: find(VENTURE_ALIASES.currentStage),
    bottlenecks: find(VENTURE_ALIASES.bottlenecks),
    resources: find(VENTURE_ALIASES.resources),
    guidance: find(VENTURE_ALIASES.guidance),
  };
}

export function toVentureRows(
  table: ParsedTable,
  columns: VentureColumnMap,
): VentureImportRow[] {
  const at = (row: string[], index: number) => (index === -1 ? "" : (row[index] ?? "").trim());
  return table.rows.map((row, i) => ({
    // +2: one for the header row, one because spreadsheets count from 1.
    line: i + 2,
    name: at(row, columns.name),
    email: at(row, columns.email).toLowerCase(),
    rollNumber: at(row, columns.rollNumber),
    ventureName: at(row, columns.ventureName),
    industry: at(row, columns.industry),
    currentStage: at(row, columns.currentStage),
    bottlenecks: at(row, columns.bottlenecks),
    resources: at(row, columns.resources),
    guidance: at(row, columns.guidance),
  }));
}

/* ────────────────────────────── student roster ───────────────────────────── */

export type ImportRow = {
  line: number;
  name: string;
  email: string;
  rollNumber: string;
  batch: string;
};

export function toImportRows(table: ParsedTable, columns: ColumnMap): ImportRow[] {
  const at = (row: string[], index: number) => (index === -1 ? "" : (row[index] ?? "").trim());
  return table.rows.map((row, i) => ({
    // +2: one for the header row, one because spreadsheets count from 1.
    line: i + 2,
    name: at(row, columns.name),
    email: at(row, columns.email).toLowerCase(),
    rollNumber: at(row, columns.rollNumber),
    batch: at(row, columns.batch),
  }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRow(row: ImportRow): string | null {
  if (!row.name) return "Missing name";
  if (row.name.length < 2) return "Name is too short";
  if (!row.email) return "Missing email";
  if (!EMAIL_RE.test(row.email)) return "Email is not valid";
  if (!row.rollNumber) return "Missing roll number";
  return null;
}
