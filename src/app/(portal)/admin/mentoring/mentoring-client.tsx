"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, Plus, Sparkles, Trash2, UserCheck, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Rating,
  Select,
  Stat,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { apiFetch, formatDate, formatTimeRange, initials, toDateInput } from "@/lib/client";

type Person = { _id: string; name: string; email: string };
type Student = { _id: string; rollNumber: string; userId?: { name?: string; email?: string } };

const emptySession = { studentId: "", date: "", startTime: "", endTime: "", topic: "" };

export function MentoringClient({
  activity,
  mentoring,
  students,
  faculty,
  mentors,
}: {
  activity: any;
  mentoring: any;
  students: Student[];
  faculty: Person[];
  mentors: Person[];
}) {
  const router = useRouter();
  const { push } = useToast();

  const [tab, setTab] = React.useState("assignments");
  const [sessionDialog, setSessionDialog] = React.useState<{ mode: "add" | "edit"; id?: string } | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [sessionForm, setSessionForm] = React.useState(emptySession);

  const assignments = mentoring.assignments ?? [];
  const sessions = React.useMemo(
    () =>
      [...(mentoring.sessions ?? [])].sort(
        (a: any, b: any) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
      ),
    [mentoring.sessions],
  );

  const assignmentByStudent = new Map(
    assignments.map((a: any) => [String(a.studentId), a] as const),
  );
  const studentById = new Map(students.map((s) => [String(s._id), s] as const));
  const personById = new Map(
    [...faculty, ...mentors].map((p) => [String(p._id), p] as const),
  );

  const fullyAssigned = assignments.filter((a: any) => a.facultyId && a.mentorId).length;
  const pendingReviews = sessions.filter(
    (s: any) => !s.facultyReview?.reviewedAt || !s.mentorReview?.reviewedAt,
  ).length;

  async function post(json: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    try {
      await apiFetch("/api/admin/mentoring", { json: { mentoringId: mentoring._id, ...json } });
      push("success", successMessage);
      setSessionDialog(null);
      setDeleting(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not save", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  function setAssignment(studentId: string, key: "facultyId" | "mentorId", value: string) {
    const current: any = assignmentByStudent.get(studentId) ?? {};
    void post(
      {
        action: "setAssignment",
        studentId,
        facultyId: key === "facultyId" ? value || null : (current.facultyId ?? null),
        mentorId: key === "mentorId" ? value || null : (current.mentorId ?? null),
      },
      "Assignment updated",
    );
  }

  return (
    <>
      <PageHeader
        title={activity.name ?? "Mentoring"}
        description="Assign each student a faculty member and mentor, then schedule their sessions."
        breadcrumb="Admin"
        action={
          <>
            <StatusBadge status={activity.status} />
            <Button
              onClick={() => {
                setSessionForm(emptySession);
                setSessionDialog({ mode: "add" });
              }}
              disabled={students.length === 0}
            >
              <Plus className="h-4 w-4" />
              Schedule session
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat
          label="Students assigned"
          value={fullyAssigned}
          hint={`of ${students.length} enrolled`}
          icon={<UserCheck className="h-4.5 w-4.5" />}
          tone={fullyAssigned === students.length ? "success" : "warning"}
        />
        <Stat label="Sessions" value={sessions.length} icon={<Sparkles className="h-4.5 w-4.5" />} tone="info" />
        <Stat
          label="Reviews pending"
          value={pendingReviews}
          icon={<FileText className="h-4.5 w-4.5" />}
          tone={pendingReviews > 0 ? "warning" : "success"}
        />
      </div>

      <Card className="mt-5">
        <div className="px-5 pt-1">
          <Tabs
            tabs={[
              { key: "assignments", label: "Assignments", count: students.length },
              { key: "sessions", label: "Sessions", count: sessions.length },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === "assignments" ? (
          students.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No students enrolled"
              description="Add student accounts from Users & Roles first."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Faculty</Th>
                  <Th>Mentor</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const assignment: any = assignmentByStudent.get(String(student._id)) ?? {};
                  const complete = assignment.facultyId && assignment.mentorId;
                  return (
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
                            <p className="text-[12px] text-[var(--fg-subtle)]">
                              {student.rollNumber}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Select
                          className="h-8 w-44 text-[13px]"
                          value={String(assignment.facultyId ?? "")}
                          onChange={(e) =>
                            setAssignment(String(student._id), "facultyId", e.target.value)
                          }
                        >
                          <option value="">Not assigned</option>
                          {faculty.map((f) => (
                            <option key={f._id} value={f._id}>
                              {f.name}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td>
                        <Select
                          className="h-8 w-44 text-[13px]"
                          value={String(assignment.mentorId ?? "")}
                          onChange={(e) =>
                            setAssignment(String(student._id), "mentorId", e.target.value)
                          }
                        >
                          <option value="">Not assigned</option>
                          {mentors.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td>
                        {complete ? (
                          <Badge tone="success" dot>
                            Assigned
                          </Badge>
                        ) : (
                          <Badge tone="warning" dot>
                            Incomplete
                          </Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No sessions scheduled"
            description="Schedule a session so the student can upload their deck and reviewers can respond."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Topic</Th>
                <Th>Date &amp; time</Th>
                <Th>Files</Th>
                <Th>Faculty</Th>
                <Th>Mentor</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session: any) => {
                const student = studentById.get(String(session.studentId));
                const fr = session.facultyReview;
                const mr = session.mentorReview;
                return (
                  <Tr key={session._id}>
                    <Td className="text-[13.5px] font-medium">
                      {student?.userId?.name ?? "Unknown"}
                    </Td>
                    <Td className="text-[13px] text-[var(--fg-muted)]">{session.topic || "—"}</Td>
                    <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                      {formatDate(session.date, "Not set")}
                      {formatTimeRange(session.startTime, session.endTime) && (
                        <span className="block text-[12px] text-[var(--fg-subtle)]">
                          {formatTimeRange(session.startTime, session.endTime)}
                        </span>
                      )}
                    </Td>
                    <Td className="text-[13px] text-[var(--fg-muted)] tabular-nums">
                      {session.files?.length ?? 0}
                    </Td>
                    <Td>
                      {fr?.reviewedAt ? (
                        <Rating value={fr.rating} readOnly size={13} />
                      ) : (
                        <Badge tone="warning">Pending</Badge>
                      )}
                    </Td>
                    <Td>
                      {mr?.reviewedAt ? (
                        <Rating value={mr.rating} readOnly size={13} />
                      ) : (
                        <Badge tone="warning">Pending</Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSessionForm({
                              studentId: String(session.studentId),
                              date: toDateInput(session.date),
                              startTime: session.startTime ?? "",
                              endTime: session.endTime ?? "",
                              topic: session.topic ?? "",
                            });
                            setSessionDialog({ mode: "edit", id: String(session._id) });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete session"
                          onClick={() => setDeleting(session)}
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

      <Dialog
        open={Boolean(sessionDialog)}
        onClose={() => setSessionDialog(null)}
        title={sessionDialog?.mode === "edit" ? "Edit session" : "Schedule mentoring session"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSessionDialog(null)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              disabled={!sessionForm.studentId}
              onClick={() =>
                post(
                  sessionDialog?.mode === "edit"
                    ? {
                        action: "updateSession",
                        sessionId: sessionDialog.id,
                        date: sessionForm.date || null,
                        startTime: sessionForm.startTime,
                        endTime: sessionForm.endTime,
                        topic: sessionForm.topic,
                      }
                    : {
                        action: "addSession",
                        studentId: sessionForm.studentId,
                        date: sessionForm.date || null,
                        startTime: sessionForm.startTime,
                        endTime: sessionForm.endTime,
                        topic: sessionForm.topic,
                      },
                  sessionDialog?.mode === "edit" ? "Session updated" : "Session scheduled",
                )
              }
            >
              {sessionDialog?.mode === "edit" ? "Save changes" : "Schedule"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Student" required>
            <Select
              value={sessionForm.studentId}
              disabled={sessionDialog?.mode === "edit"}
              onChange={(e) => setSessionForm({ ...sessionForm, studentId: e.target.value })}
            >
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.userId?.name ?? "Unnamed"} — {s.rollNumber}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Topic">
            <Input
              placeholder="e.g. Go-to-market review"
              value={sessionForm.topic}
              onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
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
        </div>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete session"
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
                  { action: "deleteSession", sessionId: String(deleting._id) },
                  "Session deleted",
                )
              }
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-6 text-[var(--fg)]">
          Delete this session? Its uploaded file references and reviews are removed. The files
          themselves stay in Google Drive.
        </p>
      </Dialog>
    </>
  );
}
