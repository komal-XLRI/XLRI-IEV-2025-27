import Link from "next/link";
import { CheckCircle2, ClipboardCheck, GraduationCap, Sparkles } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Rating,
  Stat,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { getReviewerWorkload } from "@/lib/queries";
import { formatDate, initials } from "@/lib/client";
import type { Role } from "@/lib/constants";

export async function ReviewerDashboard({
  userId,
  role,
  name,
}: {
  userId: string;
  role: Extract<Role, "FACULTY" | "MENTOR">;
  name: string;
}) {
  const workload = await getReviewerWorkload(userId, role);
  const reviewKey = role === "FACULTY" ? "facultyReview" : "mentorReview";

  const sessions = workload.sessions ?? [];
  const students = workload.students ?? [];
  const studentName = (id: string) =>
    students.find((s: any) => String(s._id) === String(id))?.userId?.name ?? "Unknown student";

  const reviewed = sessions.filter((s: any) => s[reviewKey]?.reviewedAt).length;
  const pending = sessions.length - reviewed;

  return (
    <>
      <PageHeader
        title={`Welcome, ${name.split(" ")[0]}`}
        description={`Mentoring sessions for the students assigned to you as ${role === "FACULTY" ? "faculty" : "mentor"}.`}
        action={
          <Link href="/reviews">
            <Button>
              <ClipboardCheck className="h-4 w-4" />
              Review sessions
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat
          label="Assigned students"
          value={students.length}
          icon={<GraduationCap className="h-4.5 w-4.5" />}
        />
        <Stat
          label="Awaiting your review"
          value={pending}
          hint={`${sessions.length} sessions total`}
          icon={<Sparkles className="h-4.5 w-4.5" />}
          tone={pending > 0 ? "warning" : "success"}
        />
        <Stat
          label="Reviewed"
          value={reviewed}
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent sessions"
            description="Newest first. Open a session to add a rating and feedback."
            icon={<Sparkles className="h-4 w-4" />}
            action={
              <Link href="/reviews">
                <Button size="sm" variant="secondary">
                  View all
                </Button>
              </Link>
            }
          />
          {sessions.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="No sessions assigned yet"
              description="Once the IEV office assigns students to you and schedules mentoring sessions, they will appear here."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Topic</Th>
                  <Th>Date</Th>
                  <Th>Your review</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 8).map((session: any) => (
                  <Tr key={session._id}>
                    <Td className="text-[13.5px] font-medium">{studentName(session.studentId)}</Td>
                    <Td className="text-[13px] text-[var(--fg-muted)]">{session.topic ?? "—"}</Td>
                    <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                      {formatDate(session.date)}
                    </Td>
                    <Td>
                      {session[reviewKey]?.reviewedAt ? (
                        <Rating value={session[reviewKey].rating} readOnly size={14} />
                      ) : (
                        <Badge tone="warning" dot>
                          Pending
                        </Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="My students"
            icon={<GraduationCap className="h-4 w-4" />}
            action={
              <Link href="/reviews/students">
                <Button size="sm" variant="ghost">
                  All
                </Button>
              </Link>
            }
          />
          {students.length === 0 ? (
            <EmptyState title="No students assigned" />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {students.slice(0, 6).map((student: any) => (
                <li key={student._id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11.5px] font-semibold text-[var(--brand-soft-fg)]">
                    {initials(student.userId?.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-[var(--fg)]">
                      {student.userId?.name ?? "—"}
                    </p>
                    <p className="truncate text-[12px] text-[var(--fg-subtle)]">
                      {student.venture?.ventureName ?? student.rollNumber}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
