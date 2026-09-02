"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  MinusCircle,
  Upload,
  UploadCloud,
} from "lucide-react";
import {
  Badge,
  Button,
  Callout,
  Dialog,
  Field,
  Input,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
import { mapColumns, parseDelimited, toImportRows, type ImportRow } from "@/lib/csv";
import { cn } from "@/lib/cn";

type Outcome = "create" | "update" | "skip" | "error";
type Result = {
  line: number;
  name: string;
  email: string;
  rollNumber: string;
  outcome: Outcome;
  message?: string;
};
type Summary = { total: number; create: number; update: number; skip: number; error: number };

const OUTCOME: Record<Outcome, { tone: "success" | "info" | "neutral" | "danger"; label: string }> = {
  create: { tone: "success", label: "New" },
  update: { tone: "info", label: "Completing" },
  skip: { tone: "neutral", label: "Already there" },
  error: { tone: "danger", label: "Problem" },
};

const SAMPLE = `Sr. No,Full Name,Email Id,Roll No
1,Abhigyan Anubhab,v25001@astra.xlri.ac.in,V25001
2,Abraham Joseph Thayyil,v25002@astra.xlri.ac.in,V25002`;

export function ImportStudents() {
  const router = useRouter();
  const { push } = useToast();

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"paste" | "file">("paste");
  const [raw, setRaw] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  // Rows returned by the server when a file was uploaded (Excel or CSV).
  const [fileRows, setFileRows] = React.useState<ImportRow[] | null>(null);
  const [sheets, setSheets] = React.useState<string[]>([]);
  const [sheet, setSheet] = React.useState<string>("");
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [batch, setBatch] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<{ summary: Summary; results: Result[] } | null>(null);
  const [committed, setCommitted] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setRaw("");
    setFileName("");
    setFileRows(null);
    setSheets([]);
    setSheet("");
    setPendingFile(null);
    setBatch("");
    setPreview(null);
    setParseError(null);
    setCommitted(false);
  }

  /** Parses the pasted or uploaded text into rows the API understands. */
  function parse(): ImportRow[] | null {
    setParseError(null);
    const table = parseDelimited(raw);

    if (table.headers.length === 0) {
      setParseError("Nothing to read. Paste the rows including their header line.");
      return null;
    }

    const columns = mapColumns(table.headers);
    const missing: string[] = [];
    if (columns.name === -1) missing.push("Full Name");
    if (columns.email === -1) missing.push("Email Id");
    if (columns.rollNumber === -1) missing.push("Roll No");

    if (missing.length > 0) {
      setParseError(
        `Could not find ${missing.join(", ")} in the header row. Found: ${table.headers
          .filter(Boolean)
          .join(", ")}. Include the header line from your sheet.`,
      );
      return null;
    }

    const rows = toImportRows(table, columns);
    if (rows.length === 0) {
      setParseError("The header was read, but there are no data rows beneath it.");
      return null;
    }
    return rows;
  }

  async function run(dryRun: boolean) {
    // An uploaded file was already parsed server-side; pasted text is parsed here.
    const rows = fileRows ?? parse();
    if (!rows) return;

    setBusy(true);
    try {
      const data = await apiFetch<{ summary: Summary; results: Result[] }>(
        "/api/admin/students/import",
        { json: { rows, defaultBatch: batch || undefined, dryRun } },
      );
      setPreview(data);

      if (!dryRun) {
        setCommitted(true);
        const added = data.summary.create + data.summary.update;
        push(
          "success",
          `${added} student${added === 1 ? "" : "s"} imported`,
          data.summary.error > 0
            ? `${data.summary.error} row(s) had problems and were left out.`
            : "All rows processed successfully.",
        );
        router.refresh();
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "The import could not be processed.");
    } finally {
      setBusy(false);
    }
  }

  /** Uploads the file so the server can read Excel as well as CSV. */
  async function readFile(file: File, pickSheet?: string) {
    if (file.size > 5 * 1024 * 1024) {
      setParseError("That file is larger than 5 MB. Export just the student rows.");
      return;
    }

    setParseError(null);
    setPreview(null);
    setFileName(file.name);
    setPendingFile(file);
    setBusy(true);

    try {
      const form = new FormData();
      form.append("file", file);
      if (pickSheet) form.append("sheet", pickSheet);

      const res = await fetch("/api/admin/students/parse", { method: "POST", body: form });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error ?? `Could not read that file (${res.status})`);
      }

      const data = payload.data as {
        rows: ImportRow[];
        sheets: string[];
        sheet: string | null;
      };
      setFileRows(data.rows);
      setSheets(data.sheets ?? []);
      setSheet(data.sheet ?? "");
      setRaw("");
    } catch (err) {
      setFileRows(null);
      setSheets([]);
      setParseError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  const canPreview = (fileRows !== null || raw.trim().length > 0) && !busy;
  const importable = preview ? preview.summary.create + preview.summary.update : 0;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UploadCloud className="h-4 w-4" />
        Import students
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setTimeout(reset, 200);
        }}
        title="Import students"
        description="Upload an Excel or CSV file, or paste from your sheet. Nothing is saved until you confirm."
        size="lg"
        footer={
          committed ? (
            <Button
              onClick={() => {
                setOpen(false);
                setTimeout(reset, 200);
              }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {preview ? (
                <>
                  <Button variant="secondary" onClick={() => setPreview(null)} disabled={busy}>
                    Back
                  </Button>
                  <Button onClick={() => run(false)} loading={busy} disabled={importable === 0}>
                    Import {importable} student{importable === 1 ? "" : "s"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => run(true)} loading={busy} disabled={!canPreview}>
                  Preview
                </Button>
              )}
            </>
          )
        }
      >
        {/* ── Step 2: preview / result ── */}
        {preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["create", "New", <CheckCircle2 key="c" className="h-3.5 w-3.5" />],
                  ["update", "Completing", <Upload key="u" className="h-3.5 w-3.5" />],
                  ["skip", "Already there", <MinusCircle key="s" className="h-3.5 w-3.5" />],
                  ["error", "Problems", <AlertTriangle key="e" className="h-3.5 w-3.5" />],
                ] as const
              ).map(([key, label, icon]) => (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border p-3 text-center",
                    preview.summary[key] > 0 && key === "error"
                      ? "border-[var(--danger)]/30 bg-[var(--danger-soft)]"
                      : "border-[var(--border)] bg-[var(--surface-2)]",
                  )}
                >
                  <p className="text-xl leading-none font-semibold tabular-nums">
                    {preview.summary[key]}
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-[11.5px] text-[var(--fg-muted)]">
                    {icon}
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {committed ? (
              <Callout tone="success" title="Import complete">
                {preview.summary.create + preview.summary.update} student
                {preview.summary.create + preview.summary.update === 1 ? "" : "s"} added. They can
                sign in with the email addresses below.
              </Callout>
            ) : preview.summary.error > 0 ? (
              <Callout tone="warning" title={`${preview.summary.error} row(s) will be skipped`}>
                Fix them in your sheet and import again, or continue — the rest will still be
                imported.
              </Callout>
            ) : (
              <Callout tone="info">
                Everything checks out. Nothing has been saved yet — press Import to continue.
              </Callout>
            )}

            <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border)]">
              <Table>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <Th>Row</Th>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Roll</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {preview.results.map((r) => (
                    <Tr key={r.line}>
                      <Td className="text-[12.5px] text-[var(--fg-subtle)] tabular-nums">{r.line}</Td>
                      <Td className="text-[13px] font-medium">{r.name || "—"}</Td>
                      <Td className="max-w-52 truncate text-[12.5px] text-[var(--fg-muted)]">
                        {r.email || "—"}
                      </Td>
                      <Td className="text-[12.5px] whitespace-nowrap">{r.rollNumber || "—"}</Td>
                      <Td>
                        <Badge tone={OUTCOME[r.outcome].tone}>{OUTCOME[r.outcome].label}</Badge>
                        {r.message && (
                          <span className="mt-0.5 block text-[11.5px] text-[var(--fg-subtle)]">
                            {r.message}
                          </span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        ) : (
          /* ── Step 1: input ── */
          <div className="space-y-4">
            <div className="flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
              {(
                [
                  ["paste", "Paste from sheet", <ClipboardPaste key="p" className="h-4 w-4" />],
                  ["file", "Upload file", <FileSpreadsheet key="f" className="h-4 w-4" />],
                ] as const
              ).map(([key, label, icon]) => (
                <button
                  key={key}
                  onClick={() => {
                    setMode(key);
                    setParseError(null);
                    setPreview(null);
                    if (key === "paste") {
                      setFileRows(null);
                      setFileName("");
                      setSheets([]);
                      setPendingFile(null);
                    } else {
                      setRaw("");
                    }
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                    mode === key
                      ? "bg-[var(--surface)] text-[var(--fg)] shadow-[var(--shadow-sm)]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {parseError && <Callout tone="danger">{parseError}</Callout>}

            {mode === "paste" ? (
              <Field
                label="Rows from your spreadsheet"
                required
                hint="Select the header row and the student rows in Google Sheets, copy, and paste here."
              >
                <Textarea
                  rows={9}
                  className="font-mono text-[12.5px]"
                  placeholder={SAMPLE}
                  value={raw}
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setPreview(null);
                  }}
                />
              </Field>
            ) : (
              <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void readFile(file);
                }}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                  dragging
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xlsm,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void readFile(file);
                    e.target.value = "";
                  }}
                />
                {fileRows ? (
                  <>
                    <CheckCircle2 className="mx-auto h-6 w-6 text-[var(--ok)]" />
                    <p className="mt-2 truncate text-[13.5px] font-medium text-[var(--fg)]">
                      {fileName}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--ok)]">
                      {fileRows.length} student row{fileRows.length === 1 ? "" : "s"} read
                      {sheet ? ` from sheet “${sheet}”` : ""}
                    </p>
                    <p className="mt-1 text-[11.5px] text-[var(--fg-subtle)]">
                      Click to choose a different file
                    </p>
                  </>
                ) : (
                  <>
                    <Download className="mx-auto h-6 w-6 text-[var(--fg-subtle)]" />
                    <p className="mt-2 text-[13.5px] font-medium text-[var(--fg)]">
                      {busy ? "Reading…" : "Drop a file here, or click to choose"}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--fg-subtle)]">
                      Excel (.xlsx) or CSV — straight from Google Sheets or Microsoft Excel
                    </p>
                  </>
                )}
              </div>

              {/* Workbooks often carry more than one tab. */}
              {sheets.length > 1 && (
                <Field
                  label="Sheet"
                  hint="This workbook has several sheets. Pick the one holding the roster."
                  className="mt-4"
                >
                  <Select
                    value={sheet}
                    disabled={busy}
                    onChange={(e) => {
                      setSheet(e.target.value);
                      if (pendingFile) void readFile(pendingFile, e.target.value);
                    }}
                  >
                    {sheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              </>
            )}

            <Field
              label="Batch"
              hint="Applied to every imported student, unless your sheet has its own Batch column."
            >
              <Input
                placeholder="e.g. 2025-27"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              />
            </Field>

            <div className="rounded-lg bg-[var(--surface-2)] p-3.5">
              <p className="text-[12px] font-medium text-[var(--fg)]">Expected columns</p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--fg-muted)]">
                <span className="font-medium">Full Name</span>,{" "}
                <span className="font-medium">Email Id</span> and{" "}
                <span className="font-medium">Roll No</span> — in any order. A{" "}
                <span className="font-medium">Sr. No</span> column is ignored. Works with Excel
                (.xlsx) and CSV alike. Existing students are skipped, so re-importing the same
                sheet is safe.
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
