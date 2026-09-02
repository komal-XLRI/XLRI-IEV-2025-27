"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  MapPin,
  Mic,
  Plus,
  Presentation,
  Trash2,
  Users,
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
import { apiFetch, formatDate, formatTimeRange, initials, toDateInput } from "@/lib/client";

type Student = { _id: string; rollNumber: string; userId?: { name?: string } };
type Attendance = "PRESENT" | "ABSENT" | "EXCUSED";

const emptySession = { title: "", date: "", startTime: "", endTime: "", speaker: "", venue: "" };

export function WorkshopClient({
  activity,
  workshop,
  students,
}: {
  activity: any;
  workshop: any;
  students: Student[];
}) {
  const router = useRouter();
  const { push } = useToast();

  const [sessionDialog, setSessionDialog] = React.useState<{ mode: "add" | "edit"; id?: string } | null>(
    null,
  );
  const [attendanceFor, setAttendanceFor] = React.useState<any | null>(null);
  const [reportDialog, setReportDialog] = React.useState(false);
  const [deleting, setDeleting] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [sessionForm, setSessionForm] = React.useState(emptySession);
  const [reportForm, setReportForm] = React.useState({ title: "", driveUrl: "" });
  const [roster, setRoster] = React.useState<Record<string, Attendance>>({});

  const sessions = workshop.sessions ?? [];

  const totalMarked = sessions.reduce(
    (sum: number, s: any) => sum + (s.participants?.length ?? 0),
    0,
  );
  const totalPresent = sessions.reduce(
    (sum: number, s: any) =>
      sum + (s.participants ?? []).filter((p: any) => p.attendance === "PRESENT").length,
    0,
  );

  async function post(json: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    try {
      await apiFetch("/api/admin/workshops", { json: { workshopId: workshop._id, ...json } });
      push("success", successMessage);
      setSessionDialog(null);
      setAttendanceFor(null);
      setReportDialog(false);
      setDeleting(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setSessionForm(emptySession);
    setSessionDialog({ mode: "add" });
  }

  function openEdit(session: any) {
    setSessionForm({
      title: session.title ?? "",
      date: toDateInput(session.date),
      startTime: session.startTime ?? "",
      endTime: session.endTime ?? "",
      speaker: session.speaker ?? "",
      venue: session.venue ?? "",
    });
    setSessionDialog({ mode: "edit", id: String(session._id) });
  }

  function openAttendance(session: any) {
    // Seed the roster from what is stored; anyone unrecorded defaults to absent.
    const existing = new Map(
      (session.participants ?? []).map((p: any) => [String(p.studentId), p.attendance]),
    );
    const next: Record<string, Attendance> = {};
    for (const student of students) {
      next[String(student._id)] = (existing.get(String(student._id)) as Attendance) ?? "ABSENT";
    }
    setRoster(next);
    setAttendanceFor(session);
  }

  function markAll(value: Attendance) {
    const next: Record<string, Attendance> = {};
    for (const student of students) next[String(student._id)] = value;
    setRoster(next);
  }

  const presentInRoster = Object.values(roster).filter((v) => v === "PRESENT").length;

  return (
    <>
      <PageHeader
        title={activity.name ?? "Workshop"}
        description="Sessions, speakers and attendance for the workshop track."
        breadcrumb="Admin"
        action={
          <>
            <StatusBadge status={activity.status} />
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add session
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Sessions" value={sessions.length} icon={<Presentation className="h-4.5 w-4.5" />} />
        <Stat
          label="Attendance marked"
          value={totalMarked}
          hint={`${students.length} students enrolled`}
          icon={<ClipboardCheck className="h-4.5 w-4.5" />}
          tone="info"
        />
        <Stat
          label="Present entries"
          value={totalPresent}
          hint={totalMarked > 0 ? `${Math.round((totalPresent / totalMarked) * 100)}% of marked` : "—"}
          icon={<Users className="h-4.5 w-4.5" />}
          tone="success"
        />
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Sessions"
          description="Each session has its own date, speaker and attendance sheet."
          icon={<Presentation className="h-4 w-4" />}
        />
        {sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No sessions yet"
            description="Add the first workshop session to start recording attendance."
            action={
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add session
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Date &amp; time</Th>
                <Th>Speaker</Th>
                <Th>Attendance</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session: any) => {
                const present = (session.participants ?? []).filter(
                  (p: any) => p.attendance === "PRESENT",
                ).length;
                const marked = session.participants?.length ?? 0;
                return (
                  <Tr key={session._id}>
                    <Td>
                      <p className="text-[13.5px] font-medium">{session.title}</p>
                      {session.venue && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-[var(--fg-subtle)]">
                          <MapPin className="h-3 w-3" />
                          {session.venue}
                        </p>
                      )}
                    </Td>
                    <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                      {formatDate(session.date, "Not set")}
                      {formatTimeRange(session.startTime, session.endTime) && (
                        <span className="block text-[12px] text-[var(--fg-subtle)]">
                          {formatTimeRange(session.startTime, session.endTime)}
                        </span>
                      )}
                    </Td>
                    <Td className="text-[13px] text-[var(--fg-muted)]">
                      {session.speaker ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Mic className="h-3.5 w-3.5" />
                          {session.speaker}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      {marked > 0 ? (
                        <Badge tone="success">
                          {present}/{marked} present
                        </Badge>
                      ) : (
                        <Badge tone="warning">Not marked</Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openAttendance(session)}
                          disabled={students.length === 0}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Attendance
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(session)}>
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete session"
                          onClick={() => setDeleting({ kind: "session", ...session })}
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

      <Card className="mt-5">
        <CardHeader
          title="Workshop reports"
          description="Drive folders published to the whole batch — no per-student mapping needed."
          icon={<ExternalLink className="h-4 w-4" />}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setReportForm({ title: "", driveUrl: "" });
                setReportDialog(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add report
            </Button>
          }
        />
        {(workshop.reports ?? []).length === 0 ? (
          <EmptyState title="No reports linked" description="Attach a Drive folder to share with students." />
        ) : (
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {workshop.reports.map((report: any) => (
              <div
                key={report._id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-4 py-3"
              >
                <a
                  href={report.driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--fg)] hover:text-[var(--brand)]"
                >
                  {report.title}
                </a>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Remove"
                  onClick={() => setDeleting({ kind: "report", ...report })}
                  className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardBody>
        )}
      </Card>

      {/* Session add/edit */}
      <Dialog
        open={Boolean(sessionDialog)}
        onClose={() => setSessionDialog(null)}
        title={sessionDialog?.mode === "edit" ? "Edit session" : "Add session"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSessionDialog(null)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              disabled={!sessionForm.title}
              onClick={() =>
                post(
                  sessionDialog?.mode === "edit"
                    ? {
                        action: "updateSession",
                        sessionId: sessionDialog.id,
                        session: sessionForm,
                      }
                    : { action: "addSession", session: sessionForm },
                  sessionDialog?.mode === "edit" ? "Session updated" : "Session added",
                )
              }
            >
              {sessionDialog?.mode === "edit" ? "Save changes" : "Add session"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Session title" required>
            <Input
              value={sessionForm.title}
              onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <Input
                type="date"
                value={sessionForm.date}
                onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
              />
            </Field>
            <Field label="Start time">
              <Input
                type="time"
                value={sessionForm.startTime}
                onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
              />
            </Field>
            <Field label="End time">
              <Input
                type="time"
                value={sessionForm.endTime}
                onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Speaker">
              <Input
                value={sessionForm.speaker}
                onChange={(e) => setSessionForm({ ...sessionForm, speaker: e.target.value })}
              />
            </Field>
            <Field label="Venue">
              <Input
                value={sessionForm.venue}
                onChange={(e) => setSessionForm({ ...sessionForm, venue: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Dialog>

      {/* Attendance */}
      <Dialog
        open={Boolean(attendanceFor)}
        onClose={() => setAttendanceFor(null)}
        title={`Attendance — ${attendanceFor?.title ?? ""}`}
        description={`${presentInRoster} of ${students.length} marked present`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAttendanceFor(null)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={() =>
                post(
                  {
                    action: "setAttendance",
                    sessionId: String(attendanceFor._id),
                    entries: Object.entries(roster).map(([studentId, attendance]) => ({
                      studentId,
                      attendance,
                    })),
                  },
                  "Attendance saved",
                )
              }
            >
              Save attendance
            </Button>
          </>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => markAll("PRESENT")}>
            Mark all present
          </Button>
          <Button size="sm" variant="secondary" onClick={() => markAll("ABSENT")}>
            Mark all absent
          </Button>
        </div>
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {students.map((student) => (
            <li key={student._id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand-soft-fg)]">
                {initials(student.userId?.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{student.userId?.name ?? "—"}</p>
                <p className="text-[12px] text-[var(--fg-subtle)]">{student.rollNumber}</p>
              </div>
              <Select
                className="h-8 w-32 text-[13px]"
                value={roster[String(student._id)] ?? "ABSENT"}
                onChange={(e) =>
                  setRoster({ ...roster, [String(student._id)]: e.target.value as Attendance })
                }
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="EXCUSED">Excused</option>
              </Select>
            </li>
          ))}
        </ul>
      </Dialog>

      {/* Report */}
      <Dialog
        open={reportDialog}
        onClose={() => setReportDialog(false)}
        title="Add workshop report"
        description="Paste the Drive folder link. This is shared with the whole batch."
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportDialog(false)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              disabled={!reportForm.title || !reportForm.driveUrl}
              onClick={() => post({ action: "addReport", ...reportForm }, "Report added")}
            >
              Add report
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" required>
            <Input
              placeholder="e.g. Session 1 deck"
              value={reportForm.title}
              onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
            />
          </Field>
          <Field label="Drive folder link or id" required>
            <Input
              placeholder="https://drive.google.com/drive/folders/…"
              value={reportForm.driveUrl}
              onChange={(e) => setReportForm({ ...reportForm, driveUrl: e.target.value })}
            />
          </Field>
        </div>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting?.kind === "report" ? "Remove report" : "Delete session"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={() =>
                post(
                  deleting?.kind === "report"
                    ? { action: "deleteReport", reportId: String(deleting._id) }
                    : { action: "deleteSession", sessionId: String(deleting._id) },
                  deleting?.kind === "report" ? "Report removed" : "Session deleted",
                )
              }
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-[var(--fg)]">
          {deleting?.kind === "report"
            ? "Remove this report link? The Drive folder itself is not deleted."
            : "Delete this session and its attendance record? This cannot be undone."}
        </p>
      </Dialog>
    </>
  );
}
