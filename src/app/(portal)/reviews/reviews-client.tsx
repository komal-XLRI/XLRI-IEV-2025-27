"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, MessageSquareQuote, Sparkles } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  PageHeader,
  Rating,
  Stat,
  Tabs,
  Textarea,
} from "@/components/ui";
import { FileList } from "@/components/file-list";
import { useToast } from "@/components/ui/toast";
import { apiFetch, formatDate, formatDateTime, formatTimeRange } from "@/lib/client";

type Student = { _id: string; rollNumber: string; userId?: { name?: string } };

export function ReviewsClient({
  role,
  mentoringId,
  sessions,
  students,
}: {
  role: "FACULTY" | "MENTOR";
  mentoringId: string;
  sessions: any[];
  students: Student[];
}) {
  const router = useRouter();
  const { push } = useToast();

  const reviewKey = role === "FACULTY" ? "facultyReview" : "mentorReview";
  const otherKey = role === "FACULTY" ? "mentorReview" : "facultyReview";
  const otherLabel = role === "FACULTY" ? "Mentor" : "Faculty";

  const [tab, setTab] = React.useState("pending");
  const [reviewing, setReviewing] = React.useState<any | null>(null);
  const [rating, setRating] = React.useState(0);
  const [feedback, setFeedback] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const studentById = new Map(students.map((s) => [String(s._id), s] as const));
  const studentName = (id: string) => studentById.get(String(id))?.userId?.name ?? "Unknown student";

  const pending = sessions.filter((s) => !s[reviewKey]?.reviewedAt);
  const done = sessions.filter((s) => s[reviewKey]?.reviewedAt);
  const visible = tab === "pending" ? pending : tab === "reviewed" ? done : sessions;

  function open(session: any) {
    const existing = session[reviewKey];
    setRating(existing?.rating ?? 0);
    setFeedback(existing?.feedback ?? "");
    setReviewing(session);
  }

  async function submit() {
    if (!reviewing) return;
    setSaving(true);
    try {
      await apiFetch("/api/reviews", {
        json: { mentoringId, sessionId: String(reviewing._id), rating, feedback },
      });
      push("success", "Review submitted", "The student can now see your rating and feedback.");
      setReviewing(null);
      router.refresh();
    } catch (err) {
      push("error", "Could not submit", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Mentoring reviews"
        description={`Sessions for the students assigned to you as ${role === "FACULTY" ? "faculty" : "mentor"}. Your rating and feedback are visible to that student only.`}
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total sessions" value={sessions.length} icon={<Sparkles className="h-4.5 w-4.5" />} />
        <Stat
          label="Awaiting review"
          value={pending.length}
          icon={<MessageSquareQuote className="h-4.5 w-4.5" />}
          tone={pending.length > 0 ? "warning" : "success"}
        />
        <Stat
          label="Reviewed"
          value={done.length}
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          tone="success"
        />
      </div>

      <div className="mt-5">
        <Tabs
          tabs={[
            { key: "pending", label: "Awaiting review", count: pending.length },
            { key: "reviewed", label: "Reviewed", count: done.length },
            { key: "all", label: "All", count: sessions.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {visible.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title={
              tab === "pending" ? "Nothing waiting on you" : "No sessions here yet"
            }
            description={
              tab === "pending"
                ? "Every session assigned to you has been reviewed."
                : "Sessions appear once the IEV office schedules them for your students."
            }
          />
        </Card>
      ) : (
        <div className="mt-5 space-y-5">
          {visible.map((session) => {
            const mine = session[reviewKey];
            const theirs = session[otherKey];
            const time = formatTimeRange(session.startTime, session.endTime);

            return (
              <Card key={session._id}>
                <CardHeader
                  title={studentName(session.studentId)}
                  description={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{session.topic || "Mentoring session"}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(session.date, "Date not set")}
                        {time && <span className="text-[var(--fg-subtle)]">· {time}</span>}
                      </span>
                    </span>
                  }
                  icon={<Sparkles className="h-4 w-4" />}
                  action={
                    <Button
                      size="sm"
                      variant={mine?.reviewedAt ? "secondary" : "primary"}
                      onClick={() => open(session)}
                    >
                      {mine?.reviewedAt ? "Edit review" : "Add review"}
                    </Button>
                  }
                />

                <FileList
                  files={session.files ?? []}
                  showCategory={false}
                  emptyTitle="No deck uploaded yet"
                  emptyDescription="The student has not uploaded a file for this session."
                />

                <div className="grid gap-px border-t border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
                  <div className="bg-[var(--surface)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11.5px] font-semibold tracking-wide text-[var(--fg-subtle)] uppercase">
                        Your review
                      </p>
                      {mine?.reviewedAt ? (
                        <Rating value={mine.rating} readOnly size={14} />
                      ) : (
                        <Badge tone="warning" dot>
                          Pending
                        </Badge>
                      )}
                    </div>
                    {mine?.reviewedAt ? (
                      <>
                        <p className="mt-2.5 text-[13px] leading-6 whitespace-pre-wrap text-[var(--fg)]">
                          {mine.feedback}
                        </p>
                        <p className="mt-2 text-[11.5px] text-[var(--fg-subtle)]">
                          Submitted {formatDateTime(mine.reviewedAt)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2.5 text-[13px] text-[var(--fg-subtle)] italic">
                        You have not reviewed this session yet.
                      </p>
                    )}
                  </div>

                  <div className="bg-[var(--surface)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11.5px] font-semibold tracking-wide text-[var(--fg-subtle)] uppercase">
                        {otherLabel} review
                      </p>
                      {theirs?.reviewedAt ? (
                        <Rating value={theirs.rating} readOnly size={14} />
                      ) : (
                        <Badge tone="neutral">Awaiting</Badge>
                      )}
                    </div>
                    {theirs?.reviewedAt ? (
                      <p className="mt-2.5 text-[13px] leading-6 whitespace-pre-wrap text-[var(--fg-muted)]">
                        {theirs.feedback}
                      </p>
                    ) : (
                      <p className="mt-2.5 text-[13px] text-[var(--fg-subtle)] italic">
                        Not reviewed yet.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title={reviewing ? `Review — ${studentName(reviewing.studentId)}` : "Review"}
        description={reviewing?.topic || "Mentoring session"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              loading={saving}
              disabled={rating === 0 || feedback.trim().length < 3}
            >
              Submit review
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Rating" required hint="1 = needs significant work, 5 = outstanding.">
            <div className="pt-1">
              <Rating value={rating} onChange={setRating} size={26} />
            </div>
          </Field>

          <Field
            label="Feedback"
            required
            hint="The student sees this on their mentoring page. Be specific and actionable."
          >
            <Textarea
              rows={6}
              placeholder="What worked, what needs attention, and what to do before the next session…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </Field>
        </div>
      </Dialog>
    </>
  );
}
