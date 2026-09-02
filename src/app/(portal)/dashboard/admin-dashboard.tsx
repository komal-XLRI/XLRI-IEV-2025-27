import Link from "next/link";
import {
  Building2,
  CalendarRange,
  ClipboardList,
  FileStack,
  FolderTree,
  GraduationCap,
  Presentation,
  Rocket,
  Sparkles,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, Stat, StatusBadge, Table, Td, Th, Tr } from "@/components/ui";
import { getAdminStats } from "@/lib/queries";
import { driveConfigured } from "@/lib/drive";
import { formatDate } from "@/lib/client";
import { ACTIVITY_LABELS, type ActivityType } from "@/lib/constants";

const ACTIVITY_ICON: Record<ActivityType, React.ReactNode> = {
  WORKSHOP: <Presentation className="h-4 w-4" />,
  MENTORING: <Sparkles className="h-4 w-4" />,
  SUMMER_INTERNSHIP: <ClipboardList className="h-4 w-4" />,
  CAPSTONE: <GraduationCap className="h-4 w-4" />,
  DEMO_DAY: <Rocket className="h-4 w-4" />,
  STARTUP_CONCLAVE: <Building2 className="h-4 w-4" />,
};

const QUICK_ACTIONS = [
  {
    href: "/admin/activities",
    label: "Set activity dates",
    hint: "Dates and status for all six activities",
    icon: <CalendarRange className="h-4.5 w-4.5" />,
  },
  {
    href: "/admin/mapping",
    label: "Map Drive files",
    hint: "Assign existing Drive files to students",
    icon: <ClipboardList className="h-4.5 w-4.5" />,
  },
  {
    href: "/admin/demo-day",
    label: "Manage Demo Day",
    hint: "Rounds, submission windows, folders",
    icon: <Rocket className="h-4.5 w-4.5" />,
  },
  {
    href: "/admin/users",
    label: "Users and roles",
    hint: "Add students, faculty and mentors",
    icon: <UserCog className="h-4.5 w-4.5" />,
  },
];

export async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <>
      <PageHeader
        title="Programme overview"
        description="Everything running across the IEV batch — activities, people and Drive records."
        action={
          <Link href="/admin/activities">
            <Button variant="secondary">
              <CalendarRange className="h-4 w-4" />
              Manage activities
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Students"
          value={stats.studentCount}
          hint={`${stats.ventureCount} ventures registered`}
          icon={<GraduationCap className="h-4.5 w-4.5" />}
        />
        <Stat
          label="Faculty & mentors"
          value={stats.facultyCount + stats.mentorCount}
          hint={`${stats.facultyCount} faculty · ${stats.mentorCount} mentors`}
          icon={<Users className="h-4.5 w-4.5" />}
          tone="info"
        />
        <Stat
          label="Mapped Drive files"
          value={stats.resourceCount}
          hint="Student-owned resources"
          icon={<FileStack className="h-4.5 w-4.5" />}
          tone="success"
        />
        <Stat
          label="Pending reviews"
          value={stats.pendingReviews}
          hint={`of ${stats.mentoringSessionCount} mentoring sessions`}
          icon={<Sparkles className="h-4.5 w-4.5" />}
          tone={stats.pendingReviews > 0 ? "warning" : "success"}
        />
      </div>

      {!driveConfigured && (
        <Card className="mt-4 border-[var(--warn)]/30 bg-[var(--warn-soft)]">
          <CardBody className="flex flex-wrap items-center gap-3 py-3.5">
            <FolderTree className="h-4.5 w-4.5 shrink-0 text-[var(--warn)]" />
            <p className="min-w-0 flex-1 text-[13px] text-[var(--warn)]">
              <span className="font-semibold">Google Drive is not connected.</span> Folder browsing,
              file sync and uploads are disabled until a service account is configured. Everything
              else works normally.
            </p>
            <Link href="/admin/drive">
              <Button size="sm" variant="secondary">
                Setup guide
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Activities table */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="The six activities"
            description="Dates and status are fully admin controlled — nothing is hard-coded."
            icon={<CalendarRange className="h-4 w-4" />}
            action={
              <Link href="/admin/activities">
                <Button size="sm" variant="secondary">
                  Manage
                </Button>
              </Link>
            }
          />
          {stats.activities.length === 0 ? (
            <EmptyState
              icon={<CalendarRange className="h-5 w-5" />}
              title="No activities yet"
              description="Run the seed script to create the six programme activities, or add them manually."
              action={
                <Link href="/admin/activities">
                  <Button size="sm">Go to activities</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Activity</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {stats.activities.map((activity: any) => (
                  <Tr key={activity._id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-soft-fg)]">
                          {ACTIVITY_ICON[activity.type as ActivityType]}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium">{activity.name}</p>
                          <p className="text-[12px] text-[var(--fg-subtle)]">
                            {ACTIVITY_LABELS[activity.type as ActivityType]}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-[13px] whitespace-nowrap text-[var(--fg-muted)]">
                      {formatDate(activity.date, "Not set")}
                    </Td>
                    <Td>
                      <StatusBadge status={activity.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Quick actions */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Quick actions" icon={<Upload className="h-4 w-4" />} />
            <div className="p-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <span className="mt-0.5 text-[var(--fg-subtle)] transition-colors group-hover:text-[var(--brand)]">
                    {action.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-[var(--fg)]">
                      {action.label}
                    </span>
                    <span className="block text-[12px] text-[var(--fg-subtle)]">{action.hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Demo Day submissions" icon={<Rocket className="h-4 w-4" />} />
            <CardBody className="pt-4">
              <p className="text-3xl leading-none font-semibold tabular-nums">
                {stats.submissionCount}
              </p>
              <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">
                PPTs received across all rounds
              </p>
              <Link href="/admin/demo-day" className="mt-4 block">
                <Button variant="secondary" size="sm" className="w-full">
                  Review submissions
                </Button>
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Storage" icon={<FolderTree className="h-4 w-4" />} />
            <CardBody className="space-y-2.5 pt-4 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--fg-muted)]">Google Drive</span>
                <Badge tone={driveConfigured ? "success" : "warning"} dot>
                  {driveConfigured ? "Connected" : "Not configured"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--fg-muted)]">MongoDB</span>
                <Badge tone="success" dot>
                  Connected
                </Badge>
              </div>
              <p className="pt-1 text-[12px] leading-4.5 text-[var(--fg-subtle)]">
                Files live in Drive. MongoDB stores only metadata, ownership and Drive references.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
