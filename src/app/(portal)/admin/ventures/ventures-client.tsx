"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  Td,
  Textarea,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
import { ImportVentures } from "@/components/import-ventures";

type Person = { _id: string; name: string; email: string };
type Student = { _id: string; rollNumber: string; userId?: { name?: string; email?: string } };
type Venture = {
  _id: string;
  ventureName: string;
  industry?: string;
  currentStage?: string;
  problemStatement?: string;
  solution?: string;
  bottlenecks?: string;
  resources?: string;
  guidance?: string;
  status: string;
  studentId?: Student;
  facultyId?: Person | null;
  mentorId?: Person | null;
};

const emptyForm = {
  studentId: "",
  ventureName: "",
  industry: "",
  currentStage: "",
  problemStatement: "",
  solution: "",
  bottlenecks: "",
  resources: "",
  guidance: "",
  facultyId: "",
  mentorId: "",
  status: "ACTIVE",
};

export function VenturesClient({
  ventures,
  students,
  faculty,
  mentors,
}: {
  ventures: Venture[];
  students: Student[];
  faculty: Person[];
  mentors: Person[];
}) {
  const router = useRouter();
  const { push } = useToast();

  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<Venture | null>(null);
  const [deleting, setDeleting] = React.useState<Venture | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  // A student may hold only one venture, so only unassigned students are offered.
  const availableStudents = React.useMemo(() => {
    const taken = new Set(ventures.map((v) => String(v.studentId?._id)));
    return students.filter((s) => !taken.has(String(s._id)));
  }, [ventures, students]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ventures;
    return ventures.filter(
      (v) =>
        v.ventureName.toLowerCase().includes(q) ||
        (v.industry ?? "").toLowerCase().includes(q) ||
        (v.studentId?.userId?.name ?? "").toLowerCase().includes(q),
    );
  }, [ventures, query]);

  async function create() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/ventures", {
        json: {
          studentId: form.studentId,
          ventureName: form.ventureName,
          industry: form.industry,
          currentStage: form.currentStage,
          problemStatement: form.problemStatement,
          solution: form.solution,
          bottlenecks: form.bottlenecks,
          resources: form.resources,
          guidance: form.guidance,
          facultyId: form.facultyId || null,
          mentorId: form.mentorId || null,
        },
      });
      push("success", "Venture created");
      setCreating(false);
      setForm(emptyForm);
      router.refresh();
    } catch (err) {
      push("error", "Could not create", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function update() {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/ventures/${editing._id}`, {
        method: "PATCH",
        json: {
          ventureName: form.ventureName,
          industry: form.industry,
          currentStage: form.currentStage,
          problemStatement: form.problemStatement,
          solution: form.solution,
          bottlenecks: form.bottlenecks,
          resources: form.resources,
          guidance: form.guidance,
          facultyId: form.facultyId || null,
          mentorId: form.mentorId || null,
          status: form.status,
        },
      });
      push("success", "Venture updated");
      setEditing(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/ventures/${deleting._id}`, { method: "DELETE" });
      push("success", "Venture deleted");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not delete", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  const formFields = (isCreate: boolean) => (
    <div className="space-y-4">
      {isCreate && (
        <Field label="Student" required hint="Each student may register one venture.">
          <Select
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          >
            <option value="">Select a student…</option>
            {availableStudents.map((s) => (
              <option key={s._id} value={s._id}>
                {s.userId?.name ?? "Unnamed"} — {s.rollNumber}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Startup/business name" required>
          <Input
            value={form.ventureName}
            onChange={(e) => setForm({ ...form, ventureName: e.target.value })}
          />
        </Field>
        <Field label="Startup/business sectors">
          <Input
            placeholder="e.g. Agritech, Logistics"
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Current stage" hint="Idea, prototype, pilot, revenue — however the founder describes it.">
        <Input
          placeholder="e.g. Prototype with 3 pilot customers"
          value={form.currentStage}
          onChange={(e) => setForm({ ...form, currentStage: e.target.value })}
        />
      </Field>

      <Field label="Problem statement">
        <Textarea
          rows={3}
          value={form.problemStatement}
          onChange={(e) => setForm({ ...form, problemStatement: e.target.value })}
        />
      </Field>

      <Field label="Solution">
        <Textarea
          rows={3}
          value={form.solution}
          onChange={(e) => setForm({ ...form, solution: e.target.value })}
        />
      </Field>

      <Field label="Bottlenecks / constraints">
        <Textarea
          rows={3}
          value={form.bottlenecks}
          onChange={(e) => setForm({ ...form, bottlenecks: e.target.value })}
        />
      </Field>

      <Field label="Resources that you have">
        <Textarea
          rows={3}
          value={form.resources}
          onChange={(e) => setForm({ ...form, resources: e.target.value })}
        />
      </Field>

      <Field label="Guidance that you need from us">
        <Textarea
          rows={3}
          value={form.guidance}
          onChange={(e) => setForm({ ...form, guidance: e.target.value })}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Faculty">
          <Select
            value={form.facultyId}
            onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
          >
            <option value="">Not assigned</option>
            {faculty.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mentor">
          <Select
            value={form.mentorId}
            onChange={(e) => setForm({ ...form, mentorId: e.target.value })}
          >
            <option value="">Not assigned</option>
            {mentors.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {!isCreate && (
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Ventures"
        description="One venture per student, with the faculty and mentor guiding it."
        breadcrumb="Admin"
        action={
          <>
            <ImportVentures />
            <Button
              onClick={() => {
                setForm(emptyForm);
                setCreating(true);
              }}
              disabled={availableStudents.length === 0}
              title={
                availableStudents.length === 0 ? "Every student already has a venture." : undefined
              }
            >
              <Plus className="h-4 w-4" />
              Add venture
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
          <p className="text-[13px] text-[var(--fg-muted)]">
            <span className="font-semibold text-[var(--fg)]">{ventures.length}</span> venture
            {ventures.length === 1 ? "" : "s"}
            {availableStudents.length > 0 && (
              <span className="text-[var(--fg-subtle)]">
                {" "}
                · {availableStudents.length} student(s) without one
              </span>
            )}
          </p>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <Input
              placeholder="Search ventures…"
              className="pl-9.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No ventures yet"
            description="Add a venture and assign the faculty and mentor who will guide it."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Venture</Th>
                <Th>Student</Th>
                <Th>Faculty</Th>
                <Th>Mentor</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((venture) => (
                <Tr key={venture._id}>
                  <Td>
                    <p className="text-[13.5px] font-medium">{venture.ventureName}</p>
                    {venture.industry && (
                      <p className="text-[12px] text-[var(--fg-subtle)]">{venture.industry}</p>
                    )}
                  </Td>
                  <Td className="text-[13px]">
                    <p className="truncate">{venture.studentId?.userId?.name ?? "—"}</p>
                    <p className="text-[12px] text-[var(--fg-subtle)]">
                      {venture.studentId?.rollNumber}
                    </p>
                  </Td>
                  <Td className="text-[13px] text-[var(--fg-muted)]">
                    {venture.facultyId?.name ?? <Badge tone="warning">Unassigned</Badge>}
                  </Td>
                  <Td className="text-[13px] text-[var(--fg-muted)]">
                    {venture.mentorId?.name ?? <Badge tone="warning">Unassigned</Badge>}
                  </Td>
                  <Td>
                    <StatusBadge status={venture.status} />
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit"
                        onClick={() => {
                          setEditing(venture);
                          setForm({
                            studentId: String(venture.studentId?._id ?? ""),
                            ventureName: venture.ventureName ?? "",
                            industry: venture.industry ?? "",
                            currentStage: venture.currentStage ?? "",
                            problemStatement: venture.problemStatement ?? "",
                            solution: venture.solution ?? "",
                            bottlenecks: venture.bottlenecks ?? "",
                            resources: venture.resources ?? "",
                            guidance: venture.guidance ?? "",
                            facultyId: String(venture.facultyId?._id ?? ""),
                            mentorId: String(venture.mentorId?._id ?? ""),
                            status: venture.status ?? "ACTIVE",
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete"
                        onClick={() => setDeleting(venture)}
                        className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Add venture"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={create}
              loading={saving}
              disabled={!form.studentId || !form.ventureName}
            >
              Create venture
            </Button>
          </>
        }
      >
        {formFields(true)}
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.ventureName ?? "Edit venture"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={update} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        {formFields(false)}
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete venture"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={saving}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-[var(--fg)]">
          Delete <span className="font-semibold">{deleting?.ventureName}</span>? The student record
          and any mapped Drive files stay in place.
        </p>
      </Dialog>
    </>
  );
}
