import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";
import { Callout, Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { listActivities } from "@/lib/queries";
import { ActivitiesTable } from "./activities-table";

export const metadata: Metadata = { title: "Activities" };
export const dynamic = "force-dynamic";

export default async function AdminActivitiesPage() {
  await requirePageSession(["ADMIN"]);
  const activities = await listActivities();

  return (
    <>
      <PageHeader
        title="Activities"
        description="Names, dates, times and status for the six programme activities."
        breadcrumb="Admin"
      />

      <Callout tone="info" title="Dates are never hard-coded">
        Everything here is editable at any time. Setting an activity to Completed makes it read-only
        for students — the rule is enforced on the server, not just in the interface.
      </Callout>

      <Card className="mt-5">
        {activities.length === 0 ? (
          <EmptyState
            icon={<CalendarRange className="h-5 w-5" />}
            title="No activities exist yet"
            description="Run `npm run seed` to create the six programme activities and their supporting records."
          />
        ) : (
          <ActivitiesTable activities={activities} />
        )}
      </Card>
    </>
  );
}
