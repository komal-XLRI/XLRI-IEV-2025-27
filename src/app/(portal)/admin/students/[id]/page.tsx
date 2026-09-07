import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  CalendarClock,
  FileStack,
  FileText,
  Mail,
  Presentation,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Rating,
  Stat,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getStudentDossier } from "@/lib/queries";
import { formatDate, formatDateTime, formatTimeRange, initials } from "@/lib/client";
import {
  ACTIVITY_LABELS,
  DEMO_ROUND_LABELS,
  RESOURCE_CATEGORY_LABELS,
  type ActivityType,
} from "@/lib/constants";
import { EditStudentButton } from "@/components/edit-student";

export const metadata: Metadata = { title: "Student record" };
export const dynamic = "force-dynamic";

const attendanceTone = {
  PRESENT: "success",
  ABSENT: "danger",
  EXCUSED: "warning",
} as const;

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageSession(["ADMIN"]);
  const { id } = await params;

  const data = await getStudentDossier(id);
  if (!data) notFound();

  const { student, venture, activities, workshop, mentoring, demoRounds, resources } = data;
  const user = student.userId ?? {};

  const activityLabelById = new Map<string, string>(
    (activities ?? []).map((a: any) => [
      String(a._id),
      ACTIVITY_LABELS[a.type as ActivityType] ?? a.type,
    ]),
  );

  // Mapped files, grouped under the activity they belong to.
  const filesByActivity = new Map<string, any[]>();
  for (const r of resources ?? []) {
    const key = String(r.activityId);
    filesByActivity.set(key, [...(filesByActivity.get(key) ?? []), r]);
  }

  const mentoringFiles = (mentoring.sessions ?? []).reduce(
    (n: number, s: any) => n + (s.files?.length ?? 0),
    0,
  );
  const demoSubmissions = (demoRounds ?? []).filter((r: any) => r.submission).length;
  const reviewed = (mentoring.sessions ?? []).filter(
    (s: any) => s.facultyReview?.rating || s.mentorReview?.rating,
  ).length;

  const profileSections = [
    { label: "Background", icon: <BookOpen className="h-4 w-4" />, value: student.background },
    { label: "Strengths", icon: <Award className="h-4 w-4" />, value: student.strengths },
    {
      label: "Areas to develop",
      icon: <AlertTriangle className="h-4 w-4" />,
      value: student.weakness,
    },
  ];

  return (
    <>
      <div className="mb-6">
        <Link
          href="/admin/students"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All students
        </Link>

        <Card className="overflow-hidden">
          <div className="relative h-24 bg-[var(--color-navy-900)]">
            <div className="surface-grid absolute inset-0 opacity-[0.08]" />
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--color-xlri-green)]" />
          </div>

          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="flex">
              <span className="-mt-10 grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-4 border-[var(--surface)] bg-[var(--brand)] text-[22px] leading-none font-semibold text-[var(--brand-fg)]">
                {initials(user.name)}
              </span>
            </div>

            <div className="mt-3.5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-[20px] leading-7 font-semibold tracking-[-0.01em] text-[var(--fg)]">
                  {user.name ?? "—"}
                </h1>
                {user.email && (
                  <a
                    href={`mailto:${user.email}`}
                    className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[13px] text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </a>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Badge tone="brand">Roll {student.rollNumber}</Badge>
                  {student.batch && <Badge tone="neutral">Batch {student.batch}</Badge>}
                  {user.status && <StatusBadge status={user.status} />}
                </div>
                <p className="mt-2.5 text-[12px] text-[var(--fg-subtle)]">
                  Account added {formatDate(user.createdAt)} · Last signed in{" "}
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "never"}
                </p>
              </div>

              <div className="shrink-0">
                <EditStudentButton student={student} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Workshop"
          value={`${workshop.attended}/${workshop.sessions.length}`}
          hint="Sessions attended"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <Stat
          label="Mentoring"
          value={mentoring.sessions.length}
          hint={`${reviewed} reviewed · ${mentoringFiles} file${mentoringFiles === 1 ? "" : "s"}`}
          icon={<Users className="h-4 w-4" />}
          tone="info"
        />
        <Stat
          label="Demo Day"
          value={`${demoSubmissions}/${demoRounds.length}`}
          hint="Rounds submitted"
          icon={<Presentation className="h-4 w-4" />}
          tone="warning"
        />
        <Stat
          label="Mapped files"
          value={resources.length}
          hint="Visible to this student"
          icon={<FileStack className="h-4 w-4" />}
          tone="success"
        />
      </div>

      {/* ─────────────────────────── profile ─────────────────────────── */}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {profileSections.map((section) => (
          <Card key={section.label}>
            <CardHeader title={section.label} icon={section.icon} />
            <CardBody>
              {section.value ? (
                <p className="text-[13.5px] leading-6 whitespace-pre-wrap text-[var(--fg)]">
                  {section.value}
                </p>
              ) : (
                <p className="text-[13px] text-[var(--fg-subtle)] italic">Not recorded yet.</p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* ─────────────────────────── venture ─────────────────────────── */}

      <Card className="mt-5">
        <CardHeader title="Venture" icon={<Building2 className="h-4 w-4" />} />
        {venture ? (
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Startup/business name" value={venture.ventureName} />
              <Detail label="Startup/business sectors" value={venture.industry} />
              <Detail label="Current stage" value={venture.currentStage} />
              <Detail label="Faculty" value={venture.facultyId?.name} sub={venture.facultyId?.email} />
              <Detail label="Mentor" value={venture.mentorId?.name} sub={venture.mentorId?.email} />
            </div>
            <Detail label="Problem statement" value={venture.problemStatement} block />
            <Detail label="Solution" value={venture.solution} block />
            <Detail label="Bottlenecks / constraints" value={venture.bottlenecks} block />
            <Detail label="Resources that you have" value={venture.resources} block />
            <Detail label="Guidance that you need from us" value={venture.guidance} block />
          </CardBody>
        ) : (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No venture recorded"
            description="Create one from Admin → Ventures to link this student to a venture, faculty and mentor."
          />
        )}
      </Card>

      {/* ────────────────────────── workshop ─────────────────────────── */}

      <Card className="mt-5">
        <CardHeader
          title="Workshop attendance"
          description={workshop.title ?? undefined}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        {workshop.sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title="No sessions yet"
            description="Workshop sessions are created under Admin → Workshop."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Date</Th>
                <Th>Speaker</Th>
                <Th>Attendance</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {workshop.sessions.map((s: any) => (
                <Tr key={s._id}>
                  <Td className="text-[13.5px] font-medium">{s.title}</Td>
                  <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                    {formatDate(s.date)}
                    {formatTimeRange(s.startTime, s.endTime) && (
                      <span className="block text-[12px] text-[var(--fg-subtle)]">
                        {formatTimeRange(s.startTime, s.endTime)}
                      </span>
                    )}
                  </Td>
                  <Td className="text-[13px] text-[var(--fg-muted)]">{s.speaker || "—"}</Td>
                  <Td>
                    {s.attendance ? (
                      <Badge tone={attendanceTone[s.attendance as keyof typeof attendanceTone]}>
                        {s.attendance.charAt(0) + s.attendance.slice(1).toLowerCase()}
                      </Badge>
                    ) : (
                      <span className="text-[12.5px] text-[var(--fg-subtle)] italic">
                        Not recorded
                      </span>
                    )}
                  </Td>
                  <Td className="text-[13px] text-[var(--fg-muted)]">{s.note || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* ────────────────────────── mentoring ────────────────────────── */}

      <Card className="mt-5">
        <CardHeader
          title="Mentoring"
          description={
            mentoring.faculty || mentoring.mentor
              ? `Faculty: ${mentoring.faculty?.name ?? "unassigned"} · Mentor: ${
                  mentoring.mentor?.name ?? "unassigned"
                }`
              : "No faculty or mentor assigned yet."
          }
          icon={<Users className="h-4 w-4" />}
        />
        {mentoring.sessions.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No mentoring sessions"
            description="Sessions appear here once they are scheduled under Admin → Mentoring."
          />
        ) : (
          <CardBody className="space-y-4">
            {mentoring.sessions.map((s: any) => (
              <div key={s._id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-[var(--fg)]">
                      {s.topic || "Mentoring session"}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--fg-muted)]">
                      {formatDate(s.date)}
                      {formatTimeRange(s.startTime, s.endTime)
                        ? ` · ${formatTimeRange(s.startTime, s.endTime)}`
                        : ""}
                    </p>
                  </div>
                  {s.files?.length > 0 && (
                    <Badge tone="neutral">
                      {s.files.length} file{s.files.length === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>

                {s.files?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.files.map((f: any) => (
                      <a
                        key={f.driveFileId}
                        href={`/api/files/${f.driveFileId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12.5px] text-[var(--brand)] transition-colors hover:bg-[var(--surface-hover)]"
                        title={f.fileName}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-56 truncate">{f.fileName}</span>
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ReviewBlock label="Faculty review" review={s.facultyReview} who={s.facultyReview?.facultyId} />
                  <ReviewBlock label="Mentor review" review={s.mentorReview} who={s.mentorReview?.mentorId} />
                </div>
              </div>
            ))}
          </CardBody>
        )}
      </Card>

      {/* ────────────────────────── demo day ─────────────────────────── */}

      <Card className="mt-5">
        <CardHeader title="Demo Day" icon={<Presentation className="h-4 w-4" />} />
        {demoRounds.length === 0 ? (
          <EmptyState
            icon={<Presentation className="h-5 w-5" />}
            title="No rounds configured"
            description="Rounds are set up under Admin → Demo Day."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Round</Th>
                <Th>Date</Th>
                <Th>Submission</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {demoRounds.map((r: any) => (
                <Tr key={r._id}>
                  <Td className="text-[13.5px] font-medium whitespace-nowrap">
                    {DEMO_ROUND_LABELS[r.type as keyof typeof DEMO_ROUND_LABELS] ?? r.type}
                  </Td>
                  <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                    {formatDate(r.date)}
                  </Td>
                  <Td>
                    {r.submission ? (
                      <a
                        href={`/api/files/${r.submission.driveFileId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--brand)] hover:underline"
                        title={r.submission.fileName}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-64 truncate">{r.submission.fileName}</span>
                      </a>
                    ) : (
                      <span className="text-[12.5px] text-[var(--fg-subtle)] italic">
                        {r.submissionsOpen ? "Not submitted — window open" : "Not submitted"}
                      </span>
                    )}
                  </Td>
                  <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                    {r.submission ? formatDateTime(r.submission.submittedAt) : "—"}
                  </Td>
                  <Td>
                    {r.submission ? (
                      <Badge tone={r.submission.status === "REJECTED" ? "danger" : "success"}>
                        {r.submission.status.charAt(0) + r.submission.status.slice(1).toLowerCase()}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* ──────────────────────── mapped files ───────────────────────── */}

      <Card className="mt-5 mb-2">
        <CardHeader
          title="Files"
          description="Drive files mapped to this student. These are exactly the files they can open."
          icon={<FileStack className="h-4 w-4" />}
        />
        {resources.length === 0 ? (
          <EmptyState
            icon={<FileStack className="h-5 w-5" />}
            title="No files mapped"
            description="Assign files to this student under Admin → File Mapping."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Activity</Th>
                <Th>Category</Th>
                <Th>File</Th>
                <Th className="text-right">Open</Th>
              </tr>
            </thead>
            <tbody>
              {[...filesByActivity.entries()].map(([activityId, files]) =>
                files.map((f: any, i: number) => (
                  <Tr key={f._id}>
                    <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                      {i === 0 ? (activityLabelById.get(activityId) ?? "—") : ""}
                    </Td>
                    <Td>
                      <Badge tone="neutral">
                        {RESOURCE_CATEGORY_LABELS[
                          f.category as keyof typeof RESOURCE_CATEGORY_LABELS
                        ] ?? f.category}
                      </Badge>
                    </Td>
                    <Td className="text-[13px]">
                      <span className="block max-w-80 truncate" title={f.fileName}>
                        {f.fileName}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <a
                        href={`/api/files/${f.driveFileId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--brand)] hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View
                      </a>
                    </Td>
                  </Tr>
                )),
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

/* ───────────────────────────── small pieces ─────────────────────────── */

function Detail({
  label,
  value,
  sub,
  block,
}: {
  label: string;
  value?: string | null;
  sub?: string | null;
  block?: boolean;
}) {
  return (
    <div className={block ? "" : "min-w-0"}>
      <p className="text-[12px] font-medium tracking-wide text-[var(--fg-muted)] uppercase">
        {label}
      </p>
      {value ? (
        <p className="mt-1 text-[13.5px] leading-6 whitespace-pre-wrap text-[var(--fg)]">{value}</p>
      ) : (
        <p className="mt-1 text-[13px] text-[var(--fg-subtle)] italic">Not recorded</p>
      )}
      {sub && <p className="text-[12px] text-[var(--fg-subtle)]">{sub}</p>}
    </div>
  );
}

function ReviewBlock({
  label,
  review,
  who,
}: {
  label: string;
  review?: { rating?: number; feedback?: string; reviewedAt?: string } | null;
  who?: { name?: string } | null;
}) {
  const given = Boolean(review?.rating || review?.feedback);
  return (
    <div className="rounded-lg bg-[var(--surface-2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium tracking-wide text-[var(--fg-muted)] uppercase">
          {label}
        </p>
        {given && review?.rating ? <Rating value={review.rating} readOnly size={14} /> : null}
      </div>
      {given ? (
        <>
          {review?.feedback && (
            <p className="mt-1.5 text-[13px] leading-5 whitespace-pre-wrap text-[var(--fg)]">
              {review.feedback}
            </p>
          )}
          <p className="mt-1.5 text-[11.5px] text-[var(--fg-subtle)]">
            {who?.name ? `${who.name} · ` : ""}
            {review?.reviewedAt ? formatDateTime(review.reviewedAt) : "not dated"}
          </p>
        </>
      ) : (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[var(--fg-subtle)] italic">
          <Sparkles className="h-3.5 w-3.5" />
          Awaiting review
        </p>
      )}
    </div>
  );
}
