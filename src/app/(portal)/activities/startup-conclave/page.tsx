import type { Metadata } from "next";
import { Building2, CalendarDays, Lock } from "lucide-react";
import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { FileList } from "@/components/file-list";
import { requirePageSession } from "@/lib/auth";
import { getStartupConclave, getStudentProfile, getStudentResources } from "@/lib/queries";
import { formatDate, formatTimeRange } from "@/lib/client";

export const metadata: Metadata = { title: "Startup Conclave" };
export const dynamic = "force-dynamic";

export default async function StartupConclavePage() {
  const session = await requirePageSession(["STUDENT"]);
  const [profile, data] = await Promise.all([
    getStudentProfile(session.userId),
    getStartupConclave(),
  ]);

  if (!data || !profile) {
    return (
      <>
        <PageHeader title="Startup Conclave" breadcrumb="Activities" />
        <Card>
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="Startup Conclave is not published yet"
          />
        </Card>
      </>
    );
  }

  const { activity, conclave } = data;
  const resources = await getStudentResources(String(profile._id), String(activity._id));
  const time = formatTimeRange(conclave?.startTime ?? activity.startTime, conclave?.endTime ?? activity.endTime);

  return (
    <>
      <PageHeader
        title={activity.name ?? "Startup Conclave"}
        description={conclave?.description || activity.description}
        breadcrumb="Activities"
        action={<StatusBadge status={activity.status} />}
      />

      <Callout tone="info" icon={<Lock className="h-4 w-4" />} title="View only">
        The conclave is complete. Only the documents assigned to you are shown here.
      </Callout>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="My conclave documents"
            description={`${resources.length} file${resources.length === 1 ? "" : "s"} assigned to you`}
            icon={<Building2 className="h-4 w-4" />}
          />
          <FileList
            files={resources}
            showCategory={false}
            emptyTitle="No documents assigned to you yet"
            emptyDescription="The IEV office maps each student's conclave files individually. Contact them if yours are missing."
          />
        </Card>

        <Card>
          <CardHeader title="Event details" icon={<CalendarDays className="h-4 w-4" />} />
          <CardBody className="space-y-3 text-[13px]">
            <Row label="Date" value={formatDate(conclave?.date ?? activity.date, "Not set")} />
            <Row label="Time" value={time || "Not set"} />
            <Row label="Status" value={<StatusBadge status={activity.status} />} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--fg-muted)]">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[var(--fg)]">{value}</span>
    </div>
  );
}
