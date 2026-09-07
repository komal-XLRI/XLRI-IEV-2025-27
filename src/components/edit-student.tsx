"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button, Dialog, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";

export type EditableStudent = {
  _id: string;
  rollNumber?: string;
  batch?: string;
  background?: string;
  strengths?: string;
  weakness?: string;
  userId?: { name?: string };
};

/**
 * The student profile form, shared by the roster and the detail page so the
 * two can never drift apart. `student` being null keeps the dialog closed.
 */
export function EditStudentDialog({
  student,
  onClose,
}: {
  student: EditableStudent | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    rollNumber: "",
    batch: "",
    background: "",
    strengths: "",
    weakness: "",
  });

  // Reload the form whenever a different student is opened.
  React.useEffect(() => {
    if (!student) return;
    setForm({
      rollNumber: student.rollNumber ?? "",
      batch: student.batch ?? "",
      background: student.background ?? "",
      strengths: student.strengths ?? "",
      weakness: student.weakness ?? "",
    });
  }, [student]);

  async function save() {
    if (!student) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/students/${student._id}`, { method: "PATCH", json: form });
      push("success", "Student updated");
      onClose();
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(student)}
      onClose={onClose}
      title={student?.userId?.name ?? "Edit student"}
      description="This is what the student sees on their profile page."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
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
  );
}

/** Self-contained "Edit profile" button for a single student. */
export function EditStudentButton({ student }: { student: EditableStudent }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit profile
      </Button>
      <EditStudentDialog student={open ? student : null} onClose={() => setOpen(false)} />
    </>
  );
}
