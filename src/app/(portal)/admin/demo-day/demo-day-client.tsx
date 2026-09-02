"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FolderOpen,
  Lock,
  Plus,
  Rocket,
  Settings2,
  Unlock,
} from "lucide-react";
import {
  Badge,
  Button,
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
import { apiFetch, formatDate, formatDateTime, toDateInput } from "@/lib/client";
import { DEMO_ROUND_LABELS, DEMO_ROUND_TYPES, type DemoRoundType } from "@/lib/constants";

type Student = { _id: string; rollNumber: string; userId?: { name?: string } };

const ROUND_SORT: DemoRoundType[] = ["MOCK_1", "MOCK_2", "MOCK_3", "FINAL"];

export function DemoDayClient({
  activity,
  demoDay,
  students,
}: {
  activity: any;
  demoDay: any;
  students: Student[];
}) {
  const router = useRouter();
  const { push } = useToast();

  const [editing, setEditing] = React.useState<any | null>(null);
  const [addingRound, setAddingRound] = React.useState(false);
  const [viewing, setViewing] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [newRoundType, setNewRoundType] = React.useState<DemoRoundType>("MOCK_1");
  const [form, setForm] = React.useState({
    date: "",
    startTime: "",
    endTime: "",
    submissionsOpen: false,
    driveUrl: "",
  });

  const rounds = React.useMemo(
    () =>
      [...(demoDay.rounds ?? [])].sort(
        (a, b) => ROUND_SORT.indexOf(a.type) - ROUND_SORT.indexOf(b.type),
      ),
    [demoDay.rounds],
  );

  const studentById = new Map(students.map((s) => [String(s._id), s] as const));
  const totalSubmissions = rounds.reduce(
    (sum: number, r: any) => sum + (r.submissions?.length ?? 0),
    0,
  );
  const openRounds = rounds.filter((r: any) => r.submissionsOpen).length;
  const missingRounds = DEMO_ROUND_TYPES.filter(
    (t) => !rounds.some((r: any) => r.type === t),
  );

  async function post(json: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    try {
      await apiFetch("/api/admin/demo-day", { json: { demoDayId: demoDay._id, ...json } });
      push("success", successMessage);
      setEditing(null);
      setAddingRound(false);
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(round: any) {
    setForm({
      date: toDateInput(round.date),
      startTime: round.startTime ?? "",
      endTime: round.endTime ?? "",
      submissionsOpen: Boolean(round.submissionsOpen),
      driveUrl: round.driveUrl ?? "",
    });
    setEditing(round);
  }

  return (
    <>
      <PageHeader
        title={activity.name ?? "Demo Day"}
        description="Set each round's date, Drive folder and submission window. Nothing is hard-coded."
        breadcrumb="Admin"
        action={
          <>
            <StatusBadge status={activity.status} />
            {missingRounds.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setNewRoundType(missingRounds[0]);
                  setAddingRound(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add round
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Rounds" value={rounds.length} icon={<Rocket className="h-4.5 w-4.5" />} />
        <Stat
          label="Open for submission"
          value={openRounds}
          icon={<Unlock className="h-4.5 w-4.5" />}
          tone={openRounds > 0 ? "warning" : "success"}
        />
        <Stat
          label="Total submissions"
          value={totalSubmissions}
          hint={`${students.length} students enrolled`}
          icon={<Download className="h-4.5 w-4.5" />}
          tone="info"
        />
      </div>

      {rounds.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon={<Rocket className="h-5 w-5" />}
            title="No rounds configured"
            description="Add the mock rounds and the final Demo Day."
          />
        </Card>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {rounds.map((round: any) => {
            const count = round.submissions?.length ?? 0;
            const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
            return (
              <Card key={round._id}>
                <CardHeader
                  title={DEMO_ROUND_LABELS[round.type as DemoRoundType] ?? round.type}
                  description={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(round.date, "Date not set")}
                    </span>
                  }
                  icon={<Rocket className="h-4 w-4" />}
                  action={
                    round.submissionsOpen ? (
                      <Badge tone="success" dot>
                        Open
                      </Badge>
                    ) : (
                      <Badge tone="neutral">
                        <Lock className="h-3 w-3" />
                        Closed
                      </Badge>
                    )
                  }
                />
                <CardBody className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                      <span className="text-[var(--fg-muted)]">Submissions received</span>
                      <span className="font-medium text-[var(--fg)] tabular-nums">
                        {count} / {students.length}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                      <div
                        className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[12.5px]">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle)]" />
                    {round.driveUrl ? (
                      <a
                        href={round.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[var(--brand)] hover:underline"
                      >
                        Drive folder linked
                      </a>
                    ) : (
                      <span className="text-[var(--warn)]">No Drive folder set</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(round)}>
                      <Settings2 className="h-3.5 w-3.5" />
                      Configure
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewing(round)}
                      disabled={count === 0}
                    >
                      View {count} submission{count === 1 ? "" : "s"}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Configure round */}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          editing ? `Configure ${DEMO_ROUND_LABELS[editing.type as DemoRoundType]}` : "Configure round"
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={() =>
                post(
                  {
                    action: "updateRound",
                    roundId: String(editing._id),
                    date: form.date || null,
                    startTime: form.startTime,
                    endTime: form.endTime,
                    submissionsOpen: form.submissionsOpen,
                    driveUrl: form.driveUrl,
                  },
                  "Round updated",
                )
              }
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
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
            label="Drive folder link or id"
            hint="Student submissions are uploaded into this folder. Required before opening the round."
          >
            <Input
              placeholder="https://drive.google.com/drive/folders/…"
              value={form.driveUrl}
              onChange={(e) => setForm({ ...form, driveUrl: e.target.value })}
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-3.5 transition-colors hover:bg-[var(--surface-hover)]">
            <input
              type="checkbox"
              checked={form.submissionsOpen}
              onChange={(e) => setForm({ ...form, submissionsOpen: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
            />
            <span>
              <span className="block text-[13.5px] font-medium text-[var(--fg)]">
                Open this round for submissions
              </span>
              <span className="mt-0.5 block text-[12.5px] text-[var(--fg-muted)]">
                Students can upload their deck while this is on. The server rejects uploads when it
                is off, regardless of what the interface shows.
              </span>
            </span>
          </label>
        </div>
      </Dialog>

      {/* Add round */}
      <Dialog
        open={addingRound}
        onClose={() => setAddingRound(false)}
        title="Add round"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddingRound(false)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={() => post({ action: "addRound", type: newRoundType }, "Round added")}
            >
              Add round
            </Button>
          </>
        }
      >
        <Field label="Round">
          <Select
            value={newRoundType}
            onChange={(e) => setNewRoundType(e.target.value as DemoRoundType)}
          >
            {missingRounds.map((type) => (
              <option key={type} value={type}>
                {DEMO_ROUND_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
      </Dialog>

      {/* Submissions */}
      <Dialog
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={
          viewing
            ? `${DEMO_ROUND_LABELS[viewing.type as DemoRoundType]} — submissions`
            : "Submissions"
        }
        size="lg"
      >
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>File</Th>
              <Th>Submitted</Th>
              <Th>Status</Th>
              <Th className="text-right">Open</Th>
            </tr>
          </thead>
          <tbody>
            {(viewing?.submissions ?? []).map((submission: any) => {
              const student = studentById.get(String(submission.studentId));
              return (
                <Tr key={submission._id}>
                  <Td className="text-[13.5px] font-medium">
                    {student?.userId?.name ?? "Unknown"}
                    <span className="block text-[12px] font-normal text-[var(--fg-subtle)]">
                      {student?.rollNumber}
                    </span>
                  </Td>
                  <Td className="max-w-50 truncate text-[13px] text-[var(--fg-muted)]">
                    {submission.fileName}
                  </Td>
                  <Td className="text-[12.5px] whitespace-nowrap text-[var(--fg-muted)]">
                    {formatDateTime(submission.submittedAt)}
                  </Td>
                  <Td>
                    <StatusBadge status={submission.status} />
                  </Td>
                  <Td className="text-right">
                    <a
                      href={`/api/files/${submission.driveFileId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-2.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </a>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Dialog>
    </>
  );
}
