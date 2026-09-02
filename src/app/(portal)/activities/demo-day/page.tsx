import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, Lock, Rocket, Shield } from "lucide-react";
import {
  Badge,
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { FileList } from "@/components/file-list";
import { UploadButton } from "@/components/upload-button";
import { requirePageSession } from "@/lib/auth";
import { getDemoDay, getStudentProfile } from "@/lib/queries";
import { driveConfigured } from "@/lib/drive";
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/client";
import { DEMO_ROUND_LABELS, type DemoRoundType } from "@/lib/constants";

export const metadata: Metadata = { title: "Demo Day" };
export const dynamic = "force-dynamic";

const ROUND_SORT: DemoRoundType[] = ["MOCK_1", "MOCK_2", "MOCK_3", "FINAL"];

export default async function DemoDayPage() {
  const session = await requirePageSession(["STUDENT"]);
  const [profile, data] = await Promise.all([getStudentProfile(session.userId), getDemoDay()]);

  if (!data || !profile) {
    return (
      <>
        <PageHeader title="Demo Day" breadcrumb="Activities" />
        <Card>
          <EmptyState icon={<Rocket className="h-5 w-5" />} title="Demo Day is not published yet" />
        </Card>
      </>
    );
  }

  const { activity, demoDay } = data;
  const studentId = String(profile._id);

  const rounds = [...(demoDay?.rounds ?? [])].sort(
    (a, b) => ROUND_SORT.indexOf(a.type) - ROUND_SORT.indexOf(b.type),
  );

  return (
    <>
      <PageHeader
        title={activity.name ?? "Demo Day"}
        description={activity.description || "Submit your pitch deck for each round."}
        breadcrumb="Activities"
        action={<StatusBadge status={activity.status} />}
      />

      <Callout tone="info" icon={<Shield className="h-4 w-4" />}>
        You only ever see your own submission. Other students&rsquo; decks are never exposed through
        this page, and the submission window for each round is controlled by the IEV office.
      </Callout>

      {!driveConfigured && (
        <Callout tone="warning" className="mt-4" title="Submissions temporarily unavailable">
          Google Drive is not connected on the server, so decks cannot be uploaded right now.
        </Callout>
      )}

      {rounds.length === 0 ? (
        <Card className="mt-5">
          <EmptyState
            icon={<Rocket className="h-5 w-5" />}
            title="No rounds set up yet"
            description="Mock rounds and the final Demo Day will appear here once the IEV office schedules them."
          />
        </Card>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {rounds.map((round: any) => {
            // Filter to this student before rendering — never map over all submissions.
            const mine = (round.submissions ?? []).find(
              (s: any) => String(s.studentId) === studentId,
            );
            const time = formatTimeRange(round.startTime, round.endTime);
            const open = Boolean(round.submissionsOpen);
            const canUpload = open && driveConfigured;

            return (
              <Card key={round._id} className="flex flex-col">
                <CardHeader
                  title={DEMO_ROUND_LABELS[round.type as DemoRoundType] ?? round.type}
                  description={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(round.date, "Date to be announced")}
                      {time && <span className="text-[var(--fg-subtle)]">· {time}</span>}
                    </span>
                  }
                  icon={<Rocket className="h-4 w-4" />}
                  action={
                    open ? (
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

                <CardBody className="flex flex-1 flex-col gap-4">
                  {mine ? (
                    <div className="rounded-lg border border-[var(--ok)]/25 bg-[var(--ok-soft)] p-3.5">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok)]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-[var(--ok)]">Submitted</p>
                          <p className="mt-0.5 truncate text-[12.5px] text-[var(--ok)]/85">
                            {mine.fileName}
                          </p>
                          <p className="mt-1 text-[11.5px] text-[var(--ok)]/70">
                            {formatDateTime(mine.submittedAt)}
                          </p>
                        </div>
                        <StatusBadge status={mine.status} />
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-[var(--surface-2)] px-3.5 py-3 text-[13px] text-[var(--fg-muted)]">
                      {open
                        ? "You have not submitted for this round yet."
                        : "This round is not open for submissions."}
                    </p>
                  )}

                  {mine && (
                    <div className="-mx-5 border-y border-[var(--border)]">
                      <FileList
                        files={[
                          {
                            driveFileId: mine.driveFileId,
                            fileName: mine.fileName,
                            fileType: mine.fileType,
                            uploadedAt: mine.submittedAt,
                          },
                        ]}
                        showCategory={false}
                      />
                    </div>
                  )}

                  <div className="mt-auto">
                    <UploadButton
                      endpoint="/api/student/demo-day"
                      fields={{ roundId: String(round._id) }}
                      label={mine ? "Replace submission" : "Submit PPT"}
                      size="md"
                      variant={mine ? "secondary" : "primary"}
                      disabled={!canUpload}
                      disabledReason={
                        !open ? "This round is closed." : "Google Drive is not configured."
                      }
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
