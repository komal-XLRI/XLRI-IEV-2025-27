"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  GraduationCap,
  Pencil,
  Presentation,
  Rocket,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Dialog,
  Field,
  Input,
  Select,
  StatusBadge,
  Table,
  Td,
  Textarea,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch, formatDate, formatTimeRange, toDateInput } from "@/lib/client";
import { ACTIVITY_LABELS, ACTIVITY_STATUSES, type ActivityType } from "@/lib/constants";

const ICONS: Record<ActivityType, React.ReactNode> = {
  WORKSHOP: <Presentation className="h-4 w-4" />,
  MENTORING: <Sparkles className="h-4 w-4" />,
  SUMMER_INTERNSHIP: <ClipboardList className="h-4 w-4" />,
  CAPSTONE: <GraduationCap className="h-4 w-4" />,
  DEMO_DAY: <Rocket className="h-4 w-4" />,
  STARTUP_CONCLAVE: <Building2 className="h-4 w-4" />,
};

type Activity = {
  _id: string;
  name: string;
  type: ActivityType;
  description?: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
};

export function ActivitiesTable({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [editing, setEditing] = React.useState<Activity | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    status: "UPCOMING",
  });

  function open(activity: Activity) {
    setEditing(activity);
    setForm({
      name: activity.name ?? "",
      description: activity.description ?? "",
      date: toDateInput(activity.date),
      startTime: activity.startTime ?? "",
      endTime: activity.endTime ?? "",
      status: activity.status ?? "UPCOMING",
    });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/activities/${editing._id}`, {
        method: "PATCH",
        json: {
          name: form.name,
          description: form.description,
          date: form.date || null,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          status: form.status,
        },
      });
      push("success", "Activity updated", `${form.name} was saved.`);
      setEditing(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Activity</Th>
            <Th>Date</Th>
            <Th>Time</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <Tr key={activity._id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]">
                    {ICONS[activity.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">{activity.name}</p>
                    <p className="text-[12px] text-[var(--fg-subtle)]">
                      {ACTIVITY_LABELS[activity.type]}
                    </p>
                  </div>
                </div>
              </Td>
              <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                {formatDate(activity.date, "Not set")}
              </Td>
              <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                {formatTimeRange(activity.startTime, activity.endTime) || "—"}
              </Td>
              <Td>
                <StatusBadge status={activity.status} />
              </Td>
              <Td className="text-right">
                <Button size="sm" variant="secondary" onClick={() => open(activity)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${ACTIVITY_LABELS[editing.type]}` : ""}
        description="Changes apply immediately for every student."
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
          <Field label="Display name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>

          <Field label="Description" hint="Shown to students on the activity card and page.">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" hint="Leave blank if not decided.">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Start time">
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </Field>
            <Field label="End time">
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label="Status"
            hint="Completed makes this activity read-only for students on the server."
          >
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {ACTIVITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>
    </>
  );
}
