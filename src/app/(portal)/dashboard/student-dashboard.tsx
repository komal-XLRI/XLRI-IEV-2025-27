import Link from "next/link";
import {
  Building2,
  ClipboardList,
  FileStack,
  GraduationCap,
  Lightbulb,
  Presentation,
  Rocket,
  Sparkles,
  UserSquare2,
} from "lucide-react";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";
import { ActivityCard } from "@/components/activity-card";
import {
  getStudentProfile,
  getStudentResources,
  getStudentVenture,
  listActivities,
  getDemoDay,
  getMentoring,
} from "@/lib/queries";
import { ACTIVITY_LABELS, COMPLETED_ONLY_TYPES, type ActivityType } from "@/lib/constants";

const ICONS: Record<ActivityType, React.ReactNode> = {
  WORKSHOP: <Presentation className="h-5 w-5" />,
  MENTORING: <Sparkles className="h-5 w-5" />,
  SUMMER_INTERNSHIP: <ClipboardList className="h-5 w-5" />,
  CAPSTONE: <GraduationCap className="h-5 w-5" />,
  DEMO_DAY: <Rocket className="h-5 w-5" />,
  STARTUP_CONCLAVE: <Building2 className="h-5 w-5" />,
};

const HREFS: Record<ActivityType, string> = {
  WORKSHOP: "/activities/workshop",
  MENTORING: "/activities/mentoring",
  SUMMER_INTERNSHIP: "/activities/summer-internship",
  CAPSTONE: "/activities/capstone",
  DEMO_DAY: "/activities/demo-day",
  STARTUP_CONCLAVE: "/activities/startup-conclave",
};

const ORDER: ActivityType[] = [
  "WORKSHOP",
  "MENTORING",
  "SUMMER_INTERNSHIP",
  "CAPSTONE",
  "DEMO_DAY",
  "STARTUP_CONCLAVE",
];

export async function StudentDashboard({ userId, name }: { userId: string; name: string }) {
  const profile = await getStudentProfile(userId);

  if (!profile) {
    return (
      <>
        <PageHeader title={`Welcome, ${name.split(" ")[0]}`} />
        <Card>
          <EmptyState
            icon={<UserSquare2 className="h-5 w-5" />}
            title="No student profile linked yet"
            description="Your account exists but is not linked to a student record. Please contact the IEV office so they can complete your enrolment."
          />
        </Card>
      </>
    );
  }

  const studentId = String(profile._id);
  const [venture, activities, resources, mentoringData, demoData] = await Promise.all([
    getStudentVenture(studentId),
    listActivities(),
    getStudentResources(studentId),
    getMentoring(),
    getDemoDay(),
  ]);

  const byType = new Map(activities.map((a: any) => [a.type, a]));
  const resourcesByActivity = new Map<string, number>();
  for (const r of resources) {
    const key = String(r.activityId);
    resourcesByActivity.set(key, (resourcesByActivity.get(key) ?? 0) + 1);
  }

  const mySessions = (mentoringData?.mentoring?.sessions ?? []).filter(
    (s: any) => String(s.studentId) === studentId,
  );
  const feedbackCount = mySessions.filter(
    (s: any) => s.facultyReview?.reviewedAt || s.mentorReview?.reviewedAt,
  ).length;

  const myDemoSubmissions = (demoData?.demoDay?.rounds ?? []).reduce(
    (sum: number, round: any) =>
      sum + (round.submissions ?? []).filter((s: any) => String(s.studentId) === studentId).length,
    0,
  );
  const openRounds = (demoData?.demoDay?.rounds ?? []).filter((r: any) => r.submissionsOpen).length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${name.split(" ")[0]}`}
        description="Your venture, your activities and every file that belongs to you."
        action={
          <Link href="/profile">
            <Button variant="secondary">
              <UserSquare2 className="h-4 w-4" />
              My profile
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="My resources"
          value={resources.length}
          hint="Files assigned to you"
          icon={<FileStack className="h-4.5 w-4.5" />}
        />
        <Stat
          label="Mentoring sessions"
          value={mySessions.length}
          hint={`${feedbackCount} with feedback`}
          icon={<Sparkles className="h-4.5 w-4.5" />}
          tone="info"
        />
        <Stat
          label="Demo Day PPTs"
          value={myDemoSubmissions}
          hint={openRounds > 0 ? `${openRounds} round(s) open` : "No round open"}
          icon={<Rocket className="h-4.5 w-4.5" />}
          tone={openRounds > 0 ? "warning" : "success"}
        />
        <Stat
          label="Venture"
          value={venture ? "Registered" : "—"}
          hint={venture?.ventureName ?? "Not set up yet"}
          icon={<Building2 className="h-4.5 w-4.5" />}
          tone="success"
        />
      </div>

      {/* Venture summary */}
      <Card className="mt-5">
        <CardHeader
          title="My venture"
          description={venture?.industry ? `Industry — ${venture.industry}` : undefined}
          icon={<Lightbulb className="h-4 w-4" />}
          action={
            <Link href="/venture">
              <Button size="sm" variant="secondary">
                View details
              </Button>
            </Link>
          }
        />
        {venture ? (
          <CardBody className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-2">
              <p className="text-[17px] leading-6 font-semibold text-[var(--fg)]">
                {venture.ventureName}
              </p>
              {venture.problemStatement && (
                <p className="mt-2 line-clamp-3 text-[13.5px] leading-5.5 text-[var(--fg-muted)]">
                  {venture.problemStatement}
                </p>
              )}
            </div>
            <dl className="space-y-3 text-[13px]">
              <div>
                <dt className="text-[11.5px] font-medium tracking-wide text-[var(--fg-subtle)] uppercase">
                  Faculty
                </dt>
                <dd className="mt-0.5 font-medium text-[var(--fg)]">
                  {venture.facultyId?.name ?? "Not assigned"}
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] font-medium tracking-wide text-[var(--fg-subtle)] uppercase">
                  Mentor
                </dt>
                <dd className="mt-0.5 font-medium text-[var(--fg)]">
                  {venture.mentorId?.name ?? "Not assigned"}
                </dd>
              </div>
            </dl>
          </CardBody>
        ) : (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No venture registered"
            description="Your venture has not been added yet. The IEV office will set it up for you."
          />
        )}
      </Card>

      {/* Activities */}
      <h2 className="mt-8 mb-3.5 text-[15px] font-semibold text-[var(--fg)]">My activities</h2>

      {activities.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="No activities published yet"
            description="Once the IEV office publishes the programme activities, they will appear here."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ORDER.map((type) => {
            const activity = byType.get(type) as any;
            if (!activity) return null;
            const count = resourcesByActivity.get(String(activity._id)) ?? 0;
            const readOnly =
              COMPLETED_ONLY_TYPES.includes(type) || activity.status === "COMPLETED";

            let meta: React.ReactNode = null;
            if (COMPLETED_ONLY_TYPES.includes(type)) {
              meta =
                count > 0
                  ? `${count} file${count === 1 ? "" : "s"} available to you`
                  : "No files assigned to you yet";
            } else if (type === "MENTORING") {
              meta = `${mySessions.length} session${mySessions.length === 1 ? "" : "s"} · ${feedbackCount} reviewed`;
            } else if (type === "DEMO_DAY") {
              meta = openRounds > 0 ? `${openRounds} round open for submission` : "No round open";
            }

            return (
              <ActivityCard
                key={type}
                type={type}
                name={activity.name ?? ACTIVITY_LABELS[type]}
                description={activity.description}
                status={activity.status}
                date={activity.date}
                startTime={activity.startTime}
                endTime={activity.endTime}
                href={HREFS[type]}
                icon={ICONS[type]}
                readOnly={readOnly}
                meta={meta}
              />
            );
          })}
        </div>
      )}

      <Callout tone="info" className="mt-6">
        Completed activities — Summer Internship, Capstone and Startup Conclave — are view-only.
        You will only ever see files that have been assigned to you.
      </Callout>
    </>
  );
}
