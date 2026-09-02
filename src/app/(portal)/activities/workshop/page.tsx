import type { Metadata } from "next";
import { CalendarDays, ExternalLink, MapPin, Mic, Presentation } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
  StatusBadge,
} from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getStudentProfile, getWorkshop } from "@/lib/queries";
import { formatDate, formatTimeRange } from "@/lib/client";

export const metadata: Metadata = { title: "Workshop" };
export const dynamic = "force-dynamic";

const ATTENDANCE_TONE = {
  PRESENT: "success",
  ABSENT: "danger",
  EXCUSED: "warning",
} as const;

export default async function WorkshopPage() {
  const session = await requirePageSession(["STUDENT"]);
  const [profile, data] = await Promise.all([getStudentProfile(session.userId), getWorkshop()]);

  if (!data) {
    return (
      <>
        <PageHeader title="Workshop" breadcrumb="Activities" />
        <Card>
          <EmptyState
            icon={<Presentation className="h-5 w-5" />}
            title="Workshop is not published yet"
            description="Once the IEV office sets up the workshop, its sessions will appear here."
          />
        </Card>
      </>
    );
  }

  const { activity, workshop } = data;
  const studentId = profile ? String(profile._id) : "";
  const sessions = workshop?.sessions ?? [];

  // Attendance is per-session, and a student only ever sees their own row.
  const myAttendance = sessions.map((s: any) => ({
    sessionId: String(s._id),
    status: (s.participants ?? []).find((p: any) => String(p.studentId) === studentId)?.attendance,
  }));

  const attendanceById = new Map<string, string | undefined>(
    myAttendance.map((a: any) => [a.sessionId as string, a.status as string | undefined]),
  );
  const presentCount = myAttendance.filter((a: any) => a.status === "PRESENT").length;
  const markedCount = myAttendance.filter((a: any) => a.status).length;
  const rate = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;

  return (
    <>
      <PageHeader
        title={activity.name ?? "Workshop"}
        description={activity.description || workshop?.description}
        breadcrumb="Activities"
        action={<StatusBadge status={activity.status} />}
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Sessions" value={sessions.length} icon={<Presentation className="h-4.5 w-4.5" />} />
        <Stat
          label="Attended"
          value={presentCount}
          hint={markedCount > 0 ? `of ${markedCount} marked` : "Not marked yet"}
          icon={<CalendarDays className="h-4.5 w-4.5" />}
          tone="success"
        />
        <Stat
          label="Attendance rate"
          value={markedCount > 0 ? `${rate}%` : "—"}
          icon={<Mic className="h-4.5 w-4.5" />}
          tone={rate >= 75 ? "success" : "warning"}
        />
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Sessions"
          description="Your attendance for each session, as recorded by the IEV office."
          icon={<Presentation className="h-4 w-4" />}
        />
        {sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No sessions scheduled yet"
            description="Sessions will appear here once they are added."
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {sessions.map((s: any) => {
              const status = attendanceById.get(String(s._id));
              const time = formatTimeRange(s.startTime, s.endTime);
              return (
                <li key={s._id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[var(--fg)]">{s.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--fg-muted)]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(s.date, "Date to be announced")}
                          {time && <span className="text-[var(--fg-subtle)]">· {time}</span>}
                        </span>
                        {s.speaker && (
                          <span className="inline-flex items-center gap-1.5">
                            <Mic className="h-3.5 w-3.5" />
                            {s.speaker}
                          </span>
                        )}
                        {s.venue && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {s.venue}
                          </span>
                        )}
                      </div>
                    </div>
                    {status ? (
                      <Badge tone={ATTENDANCE_TONE[status as keyof typeof ATTENDANCE_TONE]} dot>
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Not marked</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {(workshop?.reports ?? []).length > 0 && (
        <Card className="mt-5">
          <CardHeader
            title="Workshop reports"
            description="Shared resources published for the whole batch."
            icon={<ExternalLink className="h-4 w-4" />}
          />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {workshop.reports.map((report: any) => (
              <a
                key={report._id}
                href={report.driveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              >
                <span className="truncate text-[13.5px] font-medium text-[var(--fg)]">
                  {report.title}
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-[var(--fg-subtle)]" />
              </a>
            ))}
          </CardBody>
        </Card>
      )}
    </>
  );
}
