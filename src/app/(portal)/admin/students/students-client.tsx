"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileStack, GraduationCap, Pencil, Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Table,
  Td,
  Textarea,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch, initials } from "@/lib/client";
import { ImportStudents } from "@/components/import-students";

type Row = {
  _id: string;
  rollNumber: string;
  batch?: string;
  background?: string;
  strengths?: string;
  weakness?: string;
  ventureName?: string | null;
  resourceCount: number;
  userId?: { name?: string; email?: string; status?: string };
};

export function StudentsClient({ students }: { students: Row[] }) {
  const router = useRouter();
  const { push } = useToast();

  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    rollNumber: "",
    batch: "",
    background: "",
    strengths: "",
    weakness: "",
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.userId?.name ?? "").toLowerCase().includes(q) ||
        (s.userId?.email ?? "").toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.ventureName ?? "").toLowerCase().includes(q),
    );
  }, [students, query]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/students/${editing._id}`, { method: "PATCH", json: form });
      push("success", "Student updated");
      setEditing(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Students"
        description="Profiles for the batch. Import a roster, or add accounts one at a time from Users & Roles."
        breadcrumb="Admin"
        action={<ImportStudents />}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
          <p className="text-[13px] text-[var(--fg-muted)]">
            <span className="font-semibold text-[var(--fg)]">{students.length}</span> student
            {students.length === 1 ? "" : "s"} enrolled
          </p>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <Input
              placeholder="Search students…"
              className="pl-9.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="h-5 w-5" />}
            title="No students found"
            description={
              query
                ? "Try a different search term."
                : "Add student accounts from the Users & Roles page."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Roll</Th>
                <Th>Batch</Th>
                <Th>Venture</Th>
                <Th>Files</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <Tr key={student._id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11.5px] font-semibold text-[var(--brand-soft-fg)]">
                        {initials(student.userId?.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">
                          {student.userId?.name ?? "—"}
                        </p>
                        <p className="truncate text-[12px] text-[var(--fg-subtle)]">
                          {student.userId?.email}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[13px] whitespace-nowrap">{student.rollNumber}</Td>
                  <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                    {student.batch || "—"}
                  </Td>
                  <Td className="text-[13px]">
                    {student.ventureName ? (
                      <span className="truncate">{student.ventureName}</span>
                    ) : (
                      <Badge tone="warning">No venture</Badge>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-muted)] tabular-nums">
                      <FileStack className="h-3.5 w-3.5" />
                      {student.resourceCount}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(student);
                        setForm({
                          rollNumber: student.rollNumber ?? "",
                          batch: student.batch ?? "",
                          background: student.background ?? "",
                          strengths: student.strengths ?? "",
                          weakness: student.weakness ?? "",
                        });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.userId?.name ?? "Edit student"}
        description="This is what the student sees on their profile page."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Roll number" required>
              <Input
                value={form.rollNumber}
                onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
              />
            </Field>
            <Field label="Batch">
              <Input
                placeholder="e.g. 2024-26"
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Background">
            <Textarea
              rows={3}
              value={form.background}
              onChange={(e) => setForm({ ...form, background: e.target.value })}
            />
          </Field>
          <Field label="Strengths">
            <Textarea
              rows={3}
              value={form.strengths}
              onChange={(e) => setForm({ ...form, strengths: e.target.value })}
            />
          </Field>
          <Field label="Areas to develop">
            <Textarea
              rows={3}
              value={form.weakness}
              onChange={(e) => setForm({ ...form, weakness: e.target.value })}
            />
          </Field>
        </div>
      </Dialog>
    </>
  );
}
