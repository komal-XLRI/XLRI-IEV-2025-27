import type { Metadata } from "next";
import { Building2, GraduationCap, Sparkles } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Rating,
} from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getReviewerWorkload } from "@/lib/queries";
import { initials } from "@/lib/client";

export const metadata: Metadata = { title: "My Students" };
export const dynamic = "force-dynamic";

export default async function ReviewerStudentsPage() {
  const session = await requirePageSession(["FACULTY", "MENTOR"]);
  const workload = await getReviewerWorkload(
    session.userId,
    session.role as "FACULTY" | "MENTOR",
  );

  const reviewKey = session.role === "FACULTY" ? "facultyReview" : "mentorReview";
  const students = workload.students ?? [];
  const sessions = workload.sessions ?? [];

  return (
    <>
      <PageHeader
        title="My students"
        description={`Students assigned to you as ${session.role === "FACULTY" ? "faculty" : "mentor"}, with their ventures and review progress.`}
      />

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GraduationCap className="h-5 w-5" />}
            title="No students assigned"
            description="The IEV office assigns students to faculty and mentors from the Mentoring admin page."
          />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student: any) => {
            const mySessions = sessions.filter(
              (s: any) => String(s.studentId) === String(student._id),
            );
            const reviewed = mySessions.filter((s: any) => s[reviewKey]?.reviewedAt);
            const ratings = reviewed.map((s: any) => s[reviewKey].rating).filter(Boolean);
            const avg =
              ratings.length > 0
                ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
                : null;

            return (
              <Card key={student._id}>
                <CardHeader
                  title={student.userId?.name ?? "—"}
                  description={student.rollNumber}
                  icon={
                    <span className="text-[12px] font-semibold">
                      {initials(student.userId?.name)}
                    </span>
                  }
                />
                <CardBody className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fg-subtle)]" />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-[var(--fg)]">
                        {student.venture?.ventureName ?? "No venture registered"}
                      </p>
                      {student.venture?.industry && (
                        <p className="text-[12px] text-[var(--fg-subtle)]">
                          {student.venture.industry}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 text-[13px]">
                    <span className="inline-flex items-center gap-1.5 text-[var(--fg-muted)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      {mySessions.length} session{mySessions.length === 1 ? "" : "s"}
                    </span>
                    {mySessions.length > reviewed.length ? (
                      <Badge tone="warning" dot>
                        {mySessions.length - reviewed.length} to review
                      </Badge>
                    ) : mySessions.length > 0 ? (
                      <Badge tone="success" dot>
                        All reviewed
                      </Badge>
                    ) : (
                      <Badge tone="neutral">No sessions</Badge>
                    )}
                  </div>

                  {avg !== null && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-[var(--fg-muted)]">Your average rating</span>
                      <Rating value={avg} readOnly size={14} />
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
