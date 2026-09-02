"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
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
  Stat,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch, initials } from "@/lib/client";
import {
  ACTIVITY_LABELS,
  CATEGORIES_BY_ACTIVITY,
  RESOURCE_CATEGORY_LABELS,
  type ActivityType,
  type CompletedSlug,
  type ResourceCategory,
} from "@/lib/constants";
import { cn } from "@/lib/cn";

type Student = { _id: string; rollNumber: string; userId?: { name?: string; email?: string } };
type Resource = {
  _id: string;
  studentId: string;
  category: ResourceCategory;
  driveFileId: string;
  fileName: string;
  driveUrl?: string;
};

/** The Drive folder rows each activity exposes, in display order. */
function folderRows(type: ActivityType, detail: any) {
  if (!detail) return [];

  const root = {
    key: "root",
    label: "Main Drive folder",
    hint: "The top-level folder for this activity.",
    driveUrl: detail.driveUrl as string | undefined,
    payload:
      type === "SUMMER_INTERNSHIP"
        ? { target: "internshipRoot", id: detail._id }
        : type === "CAPSTONE"
          ? { target: "capstoneRoot", id: detail._id }
          : { target: "conclaveRoot", id: detail._id },
  };

  const reports = (detail.reports ?? []).map((r: any) => ({
    key: String(r._id),
    label: r.name ?? "Report",
    hint: "Holds every student's file for this report.",
    driveUrl: r.driveUrl as string | undefined,
    payload:
      type === "SUMMER_INTERNSHIP"
        ? { target: "internshipReport", id: detail._id, reportId: String(r._id) }
        : { target: "capstoneReport", id: detail._id, reportId: String(r._id) },
  }));

  const excel =
    type === "CAPSTONE"
      ? [
          {
            key: "excel",
            label: "Excel tracker",
            hint: "A single file, not a folder.",
            driveUrl: detail.excelFile?.driveUrl as string | undefined,
            payload: { target: "capstoneExcel", id: detail._id },
          },
        ]
      : [];

  return [root, ...reports, ...excel];
}

export function CompletedActivityClient({
  slug,
  type,
  activity,
  detail,
  students,
  resources,
  driveConfigured,
  serviceAccountEmail,
}: {
  slug: CompletedSlug;
  type: ActivityType;
  activity: any;
  detail: any;
  students: Student[];
  resources: Resource[];
  driveConfigured: boolean;
  serviceAccountEmail: string | null;
}) {
  const router = useRouter();
  const { push } = useToast();

  const [query, setQuery] = React.useState("");
  const [adding, setAdding] = React.useState<Student | null>(null);
  const [removing, setRemoving] = React.useState<Resource | null>(null);
  const [busy, setBusy] = React.useState(false);

  const categories = CATEGORIES_BY_ACTIVITY[type] ?? ["OTHER"];
  const [form, setForm] = React.useState({ driveUrl: "", category: categories[0] });

  // Group each student's files under them — this is the "names and their links" view.
  const byStudent = React.useMemo(() => {
    const map = new Map<string, Resource[]>();
    for (const r of resources) {
      const key = String(r.studentId);
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return map;
  }, [resources]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.userId?.name ?? "").toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q),
    );
  }, [students, query]);

  const withFiles = students.filter((s) => (byStudent.get(String(s._id)) ?? []).length > 0).length;
  const rows = folderRows(type, detail);

  async function addLink() {
    if (!adding) return;
    setBusy(true);
    try {
      await apiFetch("/api/admin/mapping", {
        json: {
          activityId: String(activity._id),
          assignments: [
            {
              studentId: String(adding._id),
              driveUrl: form.driveUrl,
              category: form.category,
            },
          ],
        },
      });
      push("success", "Link added", `${adding.userId?.name ?? "Student"} can now open this file.`);
      setAdding(null);
      setForm({ driveUrl: "", category: categories[0] });
      router.refresh();
    } catch (err) {
      push("error", "Could not add the link", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLink() {
    if (!removing) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/mapping/${removing._id}`, { method: "DELETE" });
      push("success", "Link removed", "The file itself stays in Google Drive.");
      setRemoving(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not remove", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={activity.name ?? ACTIVITY_LABELS[type]}
        description="One Drive folder for the activity, and the file each student can open."
        breadcrumb="Admin · Completed activities"
        action={
          <>
            <StatusBadge status={activity.status} />
            <Link href={`/admin/mapping?activity=${slug}`}>
              <Button variant="secondary">
                <Wand2 className="h-4 w-4" />
                Bulk map a folder
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Students" value={students.length} icon={<Users className="h-4.5 w-4.5" />} />
        <Stat
          label="With a file"
          value={withFiles}
          hint={`${students.length - withFiles} still without`}
          icon={<FileText className="h-4.5 w-4.5" />}
          tone={withFiles === students.length ? "success" : "warning"}
        />
        <Stat
          label="Files linked"
          value={resources.length}
          icon={<FolderOpen className="h-4.5 w-4.5" />}
          tone="info"
        />
      </div>

      {/* ── The activity's Drive folders ── */}
      <Card className="mt-5">
        <CardHeader
          title="Drive folders"
          description="Where this activity's files live. Students never receive these links."
          icon={<FolderOpen className="h-4 w-4" />}
          action={
            <Badge tone={driveConfigured ? "success" : "warning"} dot>
              {driveConfigured ? "Drive connected" : "Drive not configured"}
            </Badge>
          }
        />
        <CardBody className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-muted)]">
              No Drive record exists for this activity yet. Run <code>npm run seed</code> to create
              it.
            </p>
          ) : (
            rows.map((row) => <FolderField key={row.key} row={row} />)
          )}
        </CardBody>
      </Card>

      <Callout tone="info" className="mt-4" icon={<ShieldCheck className="h-4 w-4" />}>
        These folders hold the whole batch&rsquo;s work. A student only ever sees the files linked
        against their own name below &mdash; checked on the server for every request.
        {!driveConfigured && serviceAccountEmail === null && (
          <> Drive is not connected, so links are stored but files cannot be opened through the portal yet.</>
        )}
      </Callout>

      {/* ── Names and their links ── */}
      <Card className="mt-5">
        <CardHeader
          title="Students and their files"
          description="Paste a Drive link against a name to give that student access to it."
          icon={<Users className="h-4 w-4" />}
          action={
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
              <Input
                placeholder="Search students…"
                className="pl-9.5"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={query ? "No students match" : "No students enrolled"}
            description={
              query ? "Try a different search." : "Import the batch roster from the Students page."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Files they can open</Th>
                <Th className="text-right">Add</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => {
                const files = byStudent.get(String(student._id)) ?? [];
                return (
                  <Tr key={student._id}>
                    <Td className="align-top">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11.5px] font-semibold text-[var(--brand-soft-fg)]">
                          {initials(student.userId?.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium">
                            {student.userId?.name ?? "—"}
                          </p>
                          <p className="text-[12px] text-[var(--fg-subtle)]">
                            {student.rollNumber}
                          </p>
                        </div>
                      </div>
                    </Td>

                    <Td className="align-top">
                      {files.length === 0 ? (
                        <Badge tone="warning">No file linked</Badge>
                      ) : (
                        <ul className="space-y-1.5">
                          {files.map((f) => (
                            <li key={f._id} className="flex items-center gap-2">
                              <Badge tone="neutral">
                                {RESOURCE_CATEGORY_LABELS[f.category] ?? f.category}
                              </Badge>
                              <a
                                href={`/api/files/${f.driveFileId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--brand)] hover:underline"
                                title={f.fileName}
                              >
                                <span className="max-w-56 truncate">{f.fileName}</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              </a>
                              <button
                                onClick={() => setRemoving(f)}
                                className="shrink-0 rounded p-1 text-[var(--fg-subtle)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                                title="Remove this link"
                                aria-label={`Remove ${f.fileName}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Td>

                    <Td className="text-right align-top">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setAdding(student);
                          setForm({ driveUrl: "", category: categories[0] });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Link
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Add a link for one student */}
      <Dialog
        open={Boolean(adding)}
        onClose={() => setAdding(null)}
        title={`Link a file to ${adding?.userId?.name ?? "student"}`}
        description="Paste the Drive link of that student's own file. Only they will be able to open it."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(null)}>
              Cancel
            </Button>
            <Button onClick={addLink} loading={busy} disabled={!form.driveUrl.trim()}>
              Add link
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Drive file link" required>
            <div className="relative">
              <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
              <Input
                autoFocus
                placeholder="https://drive.google.com/file/d/…/view"
                className="pl-9.5"
                value={form.driveUrl}
                onChange={(e) => setForm({ ...form, driveUrl: e.target.value })}
              />
            </div>
          </Field>

          <Field label="What is this file?" hint="Shown to the student as the section heading.">
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ResourceCategory })}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {RESOURCE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>

          <p className="text-[12px] leading-5 text-[var(--fg-subtle)]">
            {driveConfigured
              ? "The file name is read from Drive automatically."
              : "Drive is not connected, so the category name is used as the file name until it is."}
          </p>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove this link"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={removeLink} loading={busy}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-[var(--fg)]">
          Remove <span className="font-semibold">{removing?.fileName}</span> from this student? They
          will no longer see it in the portal. The file stays in Google Drive.
        </p>
      </Dialog>
    </>
  );
}

/** One editable Drive folder link. */
function FolderField({
  row,
}: {
  row: { label: string; hint?: string; driveUrl?: string; payload: Record<string, unknown> };
}) {
  const router = useRouter();
  const { push } = useToast();
  const [value, setValue] = React.useState(row.driveUrl ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => setValue(row.driveUrl ?? ""), [row.driveUrl]);
  const dirty = value !== (row.driveUrl ?? "");

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/drive", { json: { ...row.payload, driveUrl: value } });
      push("success", "Saved", row.label);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Field label={row.label} hint={row.hint}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
          <Input
            placeholder="Paste the Drive link, or leave blank to clear"
            className={cn("pl-9.5", row.driveUrl && "pr-3")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        {row.driveUrl && (
          <a
            href={row.driveUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-lg border border-[var(--border-strong)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
            title="Open in Drive"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <Button
          onClick={save}
          loading={saving}
          disabled={!dirty}
          variant={dirty ? "primary" : "secondary"}
        >
          {saved && <Check className="h-4 w-4" />}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </Field>
  );
}
