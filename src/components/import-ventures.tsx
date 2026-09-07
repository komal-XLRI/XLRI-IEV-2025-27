"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
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
  Select,
  Table,
  Td,
  Textarea,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
import { mapVentureColumns, parseDelimited, toVentureRows, type VentureImportRow } from "@/lib/csv";
import { cn } from "@/lib/cn";

type Outcome = "create" | "update" | "skip" | "error";
type Result = {
  line: number;
  student: string;
  ventureName: string;
  outcome: Outcome;
  message?: string;
};
type Summary = { total: number; create: number; update: number; skip: number; error: number };

const OUTCOME: Record<Outcome, { tone: "success" | "info" | "neutral" | "danger"; label: string }> = {
  create: { tone: "success", label: "New" },
  update: { tone: "info", label: "Replacing" },
  skip: { tone: "neutral", label: "Has one" },
  error: { tone: "danger", label: "Problem" },
};

const SAMPLE = `Student Name\tRoll Number\tEmail I'd\tStartup/Business Name\tStartup/Business Sectors\tCurrent Stage\tBottlenecks/Constraints\tResource that you have\tGuidance that you need from us`;

export function ImportVentures() {
  const router = useRouter();
  const { push } = useToast();

  const [open, setOpen] = React.useState(false);
  const [raw, setRaw] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  // Rows returned by the server when a file was uploaded (Excel or CSV).
  const [fileRows, setFileRows] = React.useState<VentureImportRow[] | null>(null);
  const [sheets, setSheets] = React.useState<string[]>([]);
  const [sheet, setSheet] = React.useState("");
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [overwrite, setOverwrite] = React.useState(false);
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
    setOverwrite(false);
    setPreview(null);
    setParseError(null);
    setCommitted(false);
  }

  /** Parses pasted text into rows. Uploaded files are parsed server-side. */
  function parse(): VentureImportRow[] | null {
    setParseError(null);
    const table = parseDelimited(raw);

    if (table.headers.length === 0) {
      setParseError("Nothing to read. Paste the rows including their header line.");
      return null;
    }

    const columns = mapVentureColumns(table.headers);
    const missing: string[] = [];
    if (columns.rollNumber === -1 && columns.email === -1) missing.push("Roll Number or Email I'd");
    if (columns.ventureName === -1) missing.push("Startup/Business Name");

    if (missing.length > 0) {
      setParseError(
        `Could not find ${missing.join(", ")} in the header row. Found: ${table.headers
          .filter(Boolean)
          .join(", ")}. Include the header line from your sheet.`,
      );
      return null;
    }

    const rows = toVentureRows(table, columns);
    if (rows.length === 0) {
      setParseError("The header was read, but there are no data rows beneath it.");
      return null;
    }
    return rows;
  }

  async function run(dryRun: boolean) {
    const rows = fileRows ?? parse();
    if (!rows) return;

    setBusy(true);
    try {
      const data = await apiFetch<{ summary: Summary; results: Result[] }>(
        "/api/admin/ventures/import",
        { json: { rows, overwrite, dryRun } },
      );
      setPreview(data);

      if (!dryRun) {
        setCommitted(true);
        const added = data.summary.create + data.summary.update;
        push(
          "success",
          `${added} venture${added === 1 ? "" : "s"} imported`,
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
      setParseError("That file is larger than 5 MB. Export just the venture rows.");
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

      const res = await fetch("/api/admin/ventures/parse", { method: "POST", body: form });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error ?? `Could not read that file (${res.status})`);
      }

      const data = payload.data as { rows: VentureImportRow[]; sheets: string[]; sheet: string | null };
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
        Import ventures
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setTimeout(reset, 200);
        }}
        title="Import ventures"
        description="Upload the intake sheet, or paste from it. Nothing is saved until you confirm."
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
                    Import {importable} venture{importable === 1 ? "" : "s"}
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
        {preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["create", "New", <CheckCircle2 key="c" className="h-3.5 w-3.5" />],
                  ["update", "Replacing", <Upload key="u" className="h-3.5 w-3.5" />],
                  ["skip", "Has one", <MinusCircle key="s" className="h-3.5 w-3.5" />],
                  ["error", "Problems", <AlertTriangle key="e" className="h-3.5 w-3.5" />],
                ] as const
              ).map(([key, label, icon]) => (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border border-[var(--border)] p-3",
                    preview.summary[key] > 0 && key === "error" && "border-[var(--danger)]/40",
                  )}
                >
                  <p className="flex items-center gap-1.5 text-[11.5px] font-medium tracking-wide text-[var(--fg-muted)] uppercase">
                    {icon}
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{preview.summary[key]}</p>
                </div>
              ))}
            </div>

            {committed ? (
              <Callout tone="success" title="Import complete">
                {preview.summary.create + preview.summary.update} venture(s) written.
              </Callout>
            ) : (
              <Callout tone="info" title="Nothing has been saved yet">
                Check the rows below, then confirm.
              </Callout>
            )}

            <div className="max-h-72 overflow-auto rounded-xl border border-[var(--border)]">
              <Table>
                <thead>
                  <tr>
                    <Th>Row</Th>
                    <Th>Student</Th>
                    <Th>Venture</Th>
                    <Th>Outcome</Th>
                  </tr>
                </thead>
                <tbody>
                  {preview.results.map((r) => (
                    <Tr key={`${r.line}-${r.student}`}>
                      <Td className="text-[12.5px] text-[var(--fg-subtle)] tabular-nums">{r.line}</Td>
                      <Td className="text-[13px]">{r.student}</Td>
                      <Td className="text-[13px]">{r.ventureName || "—"}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Badge tone={OUTCOME[r.outcome].tone}>{OUTCOME[r.outcome].label}</Badge>
                          {r.message && (
                            <span className="text-[12px] text-[var(--fg-muted)]">{r.message}</span>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {parseError && (
              <Callout tone="danger" title="Could not read that">
                {parseError}
              </Callout>
            )}

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
              className={cn(
                "rounded-xl border border-dashed p-6 text-center transition-colors",
                dragging
                  ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                  : "border-[var(--border-strong)]",
              )}
            >
              <FileSpreadsheet className="mx-auto h-7 w-7 text-[var(--fg-subtle)]" />
              <p className="mt-2 text-[13.5px] font-medium text-[var(--fg)]">
                {fileName || "Drop the intake sheet here"}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--fg-muted)]">
                .xlsx, .xlsm or .csv — up to 5 MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xlsm,.csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void readFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => inputRef.current?.click()}
                loading={busy}
              >
                Choose file
              </Button>
            </div>

            {sheets.length > 1 && (
              <Field label="Sheet" hint="This workbook has more than one sheet.">
                <Select
                  value={sheet}
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

            {fileRows && (
              <Callout tone="success" title={`${fileRows.length} row(s) read`}>
                From {fileName}
                {sheet ? ` · sheet “${sheet}”` : ""}. Preview to see what will happen to each.
              </Callout>
            )}

            {!fileRows && (
              <Field
                label="Or paste from the sheet"
                hint="Include the header row. Columns may be in any order."
              >
                <Textarea
                  rows={5}
                  placeholder={SAMPLE}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
              </Field>
            )}

            <label className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] p-3">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
              />
              <span className="text-[13px] text-[var(--fg)]">
                Replace ventures that already exist
                <span className="mt-0.5 block text-[12px] text-[var(--fg-muted)]">
                  Off by default: a student who already has a venture is skipped rather than
                  overwritten. Faculty and mentor assignments are never touched either way.
                </span>
              </span>
            </label>

            <p className="text-[12px] text-[var(--fg-subtle)]">
              Ventures attach to students who already exist. Import the student roster first — a roll
              number with no matching student is reported, never created.
            </p>
          </div>
        )}
      </Dialog>
    </>
  );
}
