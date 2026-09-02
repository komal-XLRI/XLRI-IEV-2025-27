"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  ExternalLink,
  FileSearch,
  Link2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch, initials } from "@/lib/client";
import { cn } from "@/lib/cn";
import {
  ACTIVITY_LABELS,
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_LABELS,
  type ActivityType,
  type ResourceCategory,
} from "@/lib/constants";

type Student = { _id: string; rollNumber: string; userId?: { name?: string; email?: string } };
type Activity = { _id: string; name: string; type: ActivityType };

type Suggestion = {
  driveFileId: string;
  fileName: string;
  fileType?: string;
  suggestedStudentId: string | null;
  confidence: number;
  currentStudentId: string | null;
};

/** Sensible default category per activity, so admin rarely has to change it. */
const DEFAULT_CATEGORY: Partial<Record<ActivityType, ResourceCategory>> = {
  SUMMER_INTERNSHIP: "REPORT_1",
  CAPSTONE: "CAPSTONE_REPORT_1",
  STARTUP_CONCLAVE: "STARTUP_CONCLAVE",
};

export function MappingClient({
  activities,
  students,
  driveConfigured,
}: {
  activities: Activity[];
  students: Student[];
  driveConfigured: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();

  const mappable = activities.filter((a) =>
    ["SUMMER_INTERNSHIP", "CAPSTONE", "STARTUP_CONCLAVE", "WORKSHOP"].includes(a.type),
  );

  const [activityId, setActivityId] = React.useState(mappable[0]?._id ?? "");
  const [folder, setFolder] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Suggestion[] | null>(null);
  const [choices, setChoices] = React.useState<Record<string, string>>({});
  const [category, setCategory] = React.useState<ResourceCategory>("OTHER");

  const [existing, setExisting] = React.useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = React.useState(false);
  const [deleting, setDeleting] = React.useState<any | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Bulk removal — the undo when a scan assigns files to the wrong people.
  const [mapQuery, setMapQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const [clearingAll, setClearingAll] = React.useState(false);

  const activity = mappable.find((a) => a._id === activityId);
  const studentById = new Map(students.map((s) => [String(s._id), s] as const));

  React.useEffect(() => {
    if (activity) setCategory(DEFAULT_CATEGORY[activity.type] ?? "OTHER");
    setSuggestions(null);
    setChoices({});
    setSelected(new Set());
    setMapQuery("");
  }, [activityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExisting = React.useCallback(async () => {
    if (!activityId) return;
    setLoadingExisting(true);
    try {
      setExisting(await apiFetch<any[]>(`/api/admin/mapping?activityId=${activityId}`));
    } catch (err) {
      push("error", "Could not load mappings", err instanceof Error ? err.message : "");
    } finally {
      setLoadingExisting(false);
    }
  }, [activityId, push]);

  React.useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  async function scan() {
    setScanning(true);
    try {
      const data = await apiFetch<{ suggestions: Suggestion[] }>("/api/admin/mapping", {
        method: "PUT",
        json: { folder, activityId },
      });
      setSuggestions(data.suggestions);
      // Pre-fill with the guessed owner, or the existing owner if already mapped.
      const next: Record<string, string> = {};
      for (const s of data.suggestions) {
        next[s.driveFileId] = s.currentStudentId ?? s.suggestedStudentId ?? "";
      }
      setChoices(next);

      const matched = data.suggestions.filter((s) => s.suggestedStudentId || s.currentStudentId).length;
      push(
        "success",
        `Found ${data.suggestions.length} file${data.suggestions.length === 1 ? "" : "s"}`,
        `${matched} matched to a student automatically. Review before assigning.`,
      );
    } catch (err) {
      push("error", "Scan failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setScanning(false);
    }
  }

  async function assign() {
    const entries = (suggestions ?? [])
      .filter((s) => choices[s.driveFileId])
      .map((s) => ({
        studentId: choices[s.driveFileId],
        driveFileId: s.driveFileId,
        fileName: s.fileName,
        fileType: s.fileType,
        category,
      }));

    if (entries.length === 0) {
      push("warning", "Nothing to assign", "Pick a student for at least one file.");
      return;
    }

    setAssigning(true);
    try {
      const result = await apiFetch<{ assigned: number }>("/api/admin/mapping", {
        json: { activityId, assignments: entries },
      });
      push(
        "success",
        `${result.assigned} file${result.assigned === 1 ? "" : "s"} assigned`,
        "Students can now see only their own files.",
      );
      setSuggestions(null);
      setChoices({});
      setFolder("");
      await loadExisting();
      router.refresh();
    } catch (err) {
      push("error", "Could not assign", err instanceof Error ? err.message : "Try again.");
    } finally {
      setAssigning(false);
    }
  }

  async function updateOwner(id: string, studentId: string) {
    try {
      await apiFetch(`/api/admin/mapping/${id}`, { method: "PATCH", json: { studentId } });
      push("success", "Owner updated");
      await loadExisting();
    } catch (err) {
      push("error", "Could not update", err instanceof Error ? err.message : "Try again.");
    }
  }

  const visibleRows = React.useMemo(() => {
    const q = mapQuery.trim().toLowerCase();
    if (!q) return existing;
    return existing.filter((r: any) => {
      const owner = studentById.get(String(r.studentId?._id ?? r.studentId));
      return (
        String(r.fileName ?? "").toLowerCase().includes(q) ||
        (owner?.userId?.name ?? "").toLowerCase().includes(q) ||
        (owner?.rollNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [existing, mapQuery, studentById]);

  const visibleIds = React.useMemo(
    () => visibleRows.map((r: any) => String(r._id)),
    [visibleRows],
  );
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Select-all applies to what is currently shown, not the whole list. */
  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function removeSelected() {
    const ids = [...selected];
    setBusy(true);
    try {
      const res = await apiFetch<{ deleted: number }>("/api/admin/mapping", {
        method: "DELETE",
        json: { ids },
      });
      push(
        "success",
        `${res.deleted} mapping${res.deleted === 1 ? "" : "s"} removed`,
        "Those students no longer see the files. The files stay in Google Drive.",
      );
      setSelected(new Set());
      setBulkDeleting(false);
      await loadExisting();
      router.refresh();
    } catch (err) {
      push("error", "Could not remove", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAllForActivity() {
    setBusy(true);
    try {
      const res = await apiFetch<{ deleted: number }>("/api/admin/mapping", {
        method: "DELETE",
        json: { activityId, all: true },
      });
      push(
        "success",
        `${res.deleted} mapping${res.deleted === 1 ? "" : "s"} removed`,
        "This activity has no file assignments left. Scan the folder again to rebuild them.",
      );
      setSelected(new Set());
      setClearingAll(false);
      await loadExisting();
      router.refresh();
    } catch (err) {
      push("error", "Could not clear", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMapping() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/mapping/${deleting._id}`, { method: "DELETE" });
      push("success", "Mapping removed", "The file itself is untouched in Drive.");
      setDeleting(null);
      await loadExisting();
      router.refresh();
    } catch (err) {
      push("error", "Could not remove", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  const readyCount = (suggestions ?? []).filter((s) => choices[s.driveFileId]).length;

  return (
    <>
      <PageHeader
        title="Drive file mapping"
        description="Assign each file in a shared Drive folder to the student who owns it. This is what keeps one student's reports invisible to another."
        breadcrumb="Admin"
      />

      {!driveConfigured && (
        <Callout tone="warning" title="Drive is not configured">
          Scanning a folder needs a Google service account. Existing mappings are still listed and
          editable below.
        </Callout>
      )}

      {/* Scanner */}
      <Card className="mt-5">
        <CardHeader
          title="Scan a folder"
          description="Reads the folder, then guesses each file's owner from the file name. You confirm before anything is saved."
          icon={<FileSearch className="h-4 w-4" />}
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Activity" required>
              <Select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                {mappable.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({ACTIVITY_LABELS[a.type]})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category" hint="Applied to every file assigned in this batch.">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as ResourceCategory)}
              >
                {RESOURCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {RESOURCE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Drive folder link or id" required>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
                <Input
                  placeholder="https://drive.google.com/drive/folders/…"
                  className="pl-9.5"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                />
              </div>
              <Button
                onClick={scan}
                loading={scanning}
                disabled={!folder || !activityId || !driveConfigured}
              >
                <Wand2 className="h-4 w-4" />
                Scan &amp; match
              </Button>
            </div>
          </Field>
        </CardBody>
      </Card>

      {/* Review suggestions */}
      {suggestions && (
        <Card className="mt-5">
          <CardHeader
            title="Review matches"
            description={`${readyCount} of ${suggestions.length} files have an owner selected.`}
            icon={<Sparkles className="h-4 w-4" />}
            action={
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setSuggestions(null)}>
                  Cancel
                </Button>
                <Button onClick={assign} loading={assigning} disabled={readyCount === 0}>
                  Assign {readyCount} file{readyCount === 1 ? "" : "s"}
                </Button>
              </div>
            }
          />
          {suggestions.length === 0 ? (
            <EmptyState title="That folder has no files" description="Only files are listed, not sub-folders." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>File</Th>
                  <Th>Match</Th>
                  <Th>Assign to student</Th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <Tr key={s.driveFileId}>
                    <Td className="max-w-72">
                      <p className="truncate text-[13.5px] font-medium">{s.fileName}</p>
                    </Td>
                    <Td>
                      {s.currentStudentId ? (
                        <Badge tone="info">Already mapped</Badge>
                      ) : s.suggestedStudentId ? (
                        <Badge tone={s.confidence >= 6 ? "success" : "warning"}>
                          {s.confidence >= 6 ? "Confident" : "Possible"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">No match</Badge>
                      )}
                    </Td>
                    <Td>
                      <Select
                        className="h-8 w-60 text-[13px]"
                        value={choices[s.driveFileId] ?? ""}
                        onChange={(e) =>
                          setChoices({ ...choices, [s.driveFileId]: e.target.value })
                        }
                      >
                        <option value="">Skip this file</option>
                        {students.map((student) => (
                          <option key={student._id} value={student._id}>
                            {student.userId?.name ?? "Unnamed"} — {student.rollNumber}
                          </option>
                        ))}
                      </Select>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* Existing mappings */}
      <Card className="mt-5">
        <CardHeader
          title="Current mappings"
          description={
            activity
              ? `Files assigned to students for ${activity.name}.`
              : "Files assigned to students."
          }
          icon={<ClipboardList className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={loadExisting} loading={loadingExisting}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              {existing.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setClearingAll(true)}
                  className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove all
                </Button>
              )}
            </div>
          }
        />

        {existing.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3">
            <div className="relative min-w-0 flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
              <Input
                placeholder="Filter by file or student…"
                className="h-8 pl-9.5 text-[13px]"
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
              />
            </div>
            <p className="text-[12.5px] text-[var(--fg-muted)]">
              {visibleRows.length === existing.length
                ? `${existing.length} mapping${existing.length === 1 ? "" : "s"}`
                : `${visibleRows.length} of ${existing.length} shown`}
            </p>
          </div>
        )}

        {/* Selection toolbar — only present once something is ticked. */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--danger-soft)] px-5 py-2.5">
            <p className="text-[13px] font-medium text-[var(--danger)]">
              {selected.size} mapping{selected.size === 1 ? "" : "s"} selected
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
              <Button size="sm" variant="danger" onClick={() => setBulkDeleting(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove {selected.size} selected
              </Button>
            </div>
          </div>
        )}

        {existing.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="No files mapped for this activity"
            description="Scan the activity's Drive folder above to assign files to their owners."
          />
        ) : visibleRows.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="Nothing matches that filter"
            description="Try a different file name or student."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all shown mappings"
                    className="h-4 w-4 cursor-pointer accent-[var(--danger)] align-middle"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      // Partial selection reads as indeterminate, not unchecked.
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                  />
                </Th>
                <Th>File</Th>
                <Th>Category</Th>
                <Th>Owner</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row: any) => {
                const owner = studentById.get(String(row.studentId?._id ?? row.studentId));
                const isSelected = selected.has(String(row._id));
                return (
                  <Tr
                    key={row._id}
                    className={cn(isSelected && "bg-[var(--danger-soft)]/50")}
                  >
                    <Td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.fileName}`}
                        className="h-4 w-4 cursor-pointer accent-[var(--danger)] align-middle"
                        checked={isSelected}
                        onChange={() => toggleOne(String(row._id))}
                      />
                    </Td>
                    <Td className="max-w-72">
                      <p className="truncate text-[13.5px] font-medium">{row.fileName}</p>
                    </Td>
                    <Td>
                      <Badge tone="neutral">
                        {RESOURCE_CATEGORY_LABELS[row.category as ResourceCategory] ?? row.category}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand-soft-fg)]">
                          {initials(owner?.userId?.name)}
                        </span>
                        <Select
                          className="h-8 w-52 text-[13px]"
                          value={String(row.studentId?._id ?? row.studentId ?? "")}
                          onChange={(e) => updateOwner(row._id, e.target.value)}
                        >
                          {students.map((student) => (
                            <option key={student._id} value={student._id}>
                              {student.userId?.name ?? "Unnamed"} — {student.rollNumber}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <a
                          href={`/api/files/${row.driveFileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
                          title="Open file"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Remove mapping"
                          onClick={() => setDeleting(row)}
                          className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Bulk: the selected rows */}
      <Dialog
        open={bulkDeleting}
        onClose={() => setBulkDeleting(false)}
        title={`Remove ${selected.size} mapping${selected.size === 1 ? "" : "s"}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkDeleting(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={removeSelected} loading={busy}>
              <Trash2 className="h-4 w-4" />
              Remove {selected.size} mapping{selected.size === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-[var(--fg)]">
          These students will no longer see the files listed below. The files themselves stay in
          Google Drive, so you can map them again afterwards.
        </p>
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-3">
          {existing
            .filter((r: any) => selected.has(String(r._id)))
            .map((r: any) => {
              const owner = studentById.get(String(r.studentId?._id ?? r.studentId));
              return (
                <li key={r._id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-[var(--fg)]">{r.fileName}</span>
                  <span className="shrink-0 text-[var(--fg-subtle)]">
                    {owner?.userId?.name ?? "Unknown"}
                  </span>
                </li>
              );
            })}
        </ul>
      </Dialog>

      {/* Bulk: everything for this activity */}
      <Dialog
        open={clearingAll}
        onClose={() => setClearingAll(false)}
        title="Remove every mapping for this activity"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClearingAll(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={removeAllForActivity} loading={busy}>
              <Trash2 className="h-4 w-4" />
              Remove all {existing.length}
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-[var(--fg)]">
          This clears all{" "}
          <span className="font-semibold">{existing.length} file assignment{existing.length === 1 ? "" : "s"}</span>{" "}
          for <span className="font-semibold">{activity?.name ?? "this activity"}</span>. Every
          student loses access to their files for it until you map the folder again.
        </p>
        <p className="mt-3 text-[12.5px] text-[var(--fg-muted)]">
          Nothing is deleted from Google Drive — only the record of who owns what. Use this to start
          a mis-run scan over from scratch.
        </p>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Remove mapping"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={removeMapping} loading={busy}>
              Remove mapping
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-[var(--fg)]">
          Remove <span className="font-semibold">{deleting?.fileName}</span> from this student? They
          will no longer see it in the portal. The file stays in Google Drive.
        </p>
      </Dialog>
    </>
  );
}
