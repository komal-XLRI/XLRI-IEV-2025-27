import type { Metadata } from "next";
import { CalendarDays, MessageSquareQuote, Sparkles, UserCheck, Users } from "lucide-react";
import {
  Badge,
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Rating,
  Stat,
  StatusBadge,
} from "@/components/ui";
import { FileList } from "@/components/file-list";
import { UploadButton } from "@/components/upload-button";
import { requirePageSession } from "@/lib/auth";
import { getMentoring, getStudentProfile } from "@/lib/queries";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { serialize } from "@/lib/api";
import { driveConfigured } from "@/lib/drive";
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/client";

export const metadata: Metadata = { title: "Mentoring" };
export const dynamic = "force-dynamic";

export default async function MentoringPage() {
  const session = await requirePageSession(["STUDENT"]);
  const [profile, data] = await Promise.all([getStudentProfile(session.userId), getMentoring()]);

  if (!data || !profile) {
    return (
      <>
        <PageHeader title="Mentoring" breadcrumb="Activities" />
        <Card>
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Mentoring is not published yet" />
        </Card>
      </>
    );
  }

  const { activity, mentoring } = data;
  const studentId = String(profile._id);
  const isClosed = activity.status === "COMPLETED";

  const mySessions = (mentoring?.sessions ?? [])
    .filter((s: any) => String(s.studentId) === studentId)
    .sort((a: any, b: any) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  const assignment = (mentoring?.assignments ?? []).find(
    (a: any) => String(a.studentId) === studentId,
  );

  await connectDB();
  const reviewerIds = [assignment?.facultyId, assignment?.mentorId].filter(Boolean);
  const reviewers = reviewerIds.length
    ? serialize(await User.find({ _id: { $in: reviewerIds } }).select("name email role").lean())
    : [];
  const reviewerById = new Map(reviewers.map((u: any) => [String(u._id), u]));

  const reviewedCount = mySessions.filter(
    (s: any) => s.facultyReview?.reviewedAt || s.mentorReview?.reviewedAt,
  ).length;
  const fileCount = mySessions.reduce((sum: number, s: any) => sum + (s.files?.length ?? 0), 0);

  return (
    <>
      <PageHeader
        title={activity.name ?? "Mentoring"}
        description={activity.description || "Upload your deck before each session and read the feedback afterwards."}
        breadcrumb="Activities"
        action={<StatusBadge status={activity.status} />}
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="My sessions" value={mySessions.length} icon={<Sparkles className="h-4.5 w-4.5" />} />
        <Stat
          label="Files uploaded"
          value={fileCount}
          icon={<CalendarDays className="h-4.5 w-4.5" />}
          tone="info"
        />
        <Stat
          label="With feedback"
          value={reviewedCount}
          hint={`of ${mySessions.length} sessions`}
          icon={<MessageSquareQuote className="h-4.5 w-4.5" />}
          tone="success"
        />
      </div>

      {/* Guidance team */}
      <Card className="mt-5">
        <CardHeader title="Your reviewers" icon={<Users className="h-4 w-4" />} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {(["faculty", "mentor"] as const).map((kind) => {
            const id = kind === "faculty" ? assignment?.facultyId : assignment?.mentorId;
            const person = id ? reviewerById.get(String(id)) : null;
            return (
              <div key={kind} className="flex items-center gap-3 rounded-lg bg-[var(--surface-2)] p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]">
                  <UserCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium tracking-wide text-[var(--fg-subtle)] uppercase">
                    {kind === "faculty" ? "Faculty" : "Mentor"}
                  </p>
                  <p className="truncate text-[13.5px] font-medium text-[var(--fg)]">
                    {person?.name ?? "Not assigned yet"}
                  </p>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {isClosed && (
        <Callout tone="warning" className="mt-5" title="Mentoring is closed">
          This activity has been marked complete. You can still read your sessions and feedback, but
          new uploads are no longer accepted.
        </Callout>
      )}

      {!driveConfigured && !isClosed && (
        <Callout tone="warning" className="mt-5" title="Uploads temporarily unavailable">
          Google Drive is not connected on the server, so files cannot be uploaded right now.
          Contact the IEV office.
        </Callout>
      )}

      {/* Sessions */}
      <h2 className="mt-8 mb-3.5 text-[15px] font-semibold text-[var(--fg)]">My sessions</h2>

      {mySessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No mentoring sessions scheduled"
            description="Once the IEV office schedules a session for you, it will appear here with an upload option."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {mySessions.map((s: any) => {
            const time = formatTimeRange(s.startTime, s.endTime);
            const facultyReview = s.facultyReview?.reviewedAt ? s.facultyReview : null;
            const mentorReview = s.mentorReview?.reviewedAt ? s.mentorReview : null;

            return (
              <Card key={s._id}>
                <CardHeader
                  title={s.topic || "Mentoring session"}
                  description={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(s.date, "Date to be announced")}
                      {time && <span className="text-[var(--fg-subtle)]">· {time}</span>}
                    </span>
                  }
                  icon={<Sparkles className="h-4 w-4" />}
                  action={
                    <UploadButton
                      endpoint="/api/student/mentoring"
                      fields={{ sessionId: String(s._id) }}
                      label="Upload PPT/PDF"
                      disabled={isClosed || !driveConfigured}
                      disabledReason={
                        isClosed ? "Mentoring is closed." : "Google Drive is not configured."
                      }
                    />
                  }
                />

                <FileList
                  files={s.files ?? []}
                  showCategory={false}
                  emptyTitle="No files uploaded yet"
                  emptyDescription="Upload your deck ahead of the session so your faculty and mentor can review it."
                />

                {(facultyReview || mentorReview) && (
                  <div className="grid gap-px border-t border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
                    {[
                      { label: "Faculty feedback", review: facultyReview },
                      { label: "Mentor feedback", review: mentorReview },
                    ].map(({ label, review }) => (
                      <div key={label} className="bg-[var(--surface)] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11.5px] font-semibold tracking-wide text-[var(--fg-subtle)] uppercase">
                            {label}
                          </p>
                          {review ? (
                            <Rating value={review.rating} readOnly size={14} />
                          ) : (
                            <Badge tone="neutral">Awaiting</Badge>
                          )}
                        </div>
                        {review ? (
                          <>
                            <p className="mt-2.5 text-[13px] leading-6 whitespace-pre-wrap text-[var(--fg)]">
                              {review.feedback}
                            </p>
                            <p className="mt-2 text-[11.5px] text-[var(--fg-subtle)]">
                              Reviewed {formatDateTime(review.reviewedAt)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2.5 text-[13px] text-[var(--fg-subtle)] italic">
                            Not reviewed yet.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
