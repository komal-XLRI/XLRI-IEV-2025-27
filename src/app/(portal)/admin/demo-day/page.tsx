import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getDemoDay, listStudentsWithUsers } from "@/lib/queries";
import { DemoDayClient } from "./demo-day-client";

export const metadata: Metadata = { title: "Demo Day" };
export const dynamic = "force-dynamic";

export default async function AdminDemoDayPage() {
  await requirePageSession(["ADMIN"]);
  const [data, students] = await Promise.all([getDemoDay(), listStudentsWithUsers()]);

  if (!data?.demoDay) {
    return (
      <>
        <PageHeader title="Demo Day" breadcrumb="Admin" />
        <Card>
          <EmptyState
            icon={<Rocket className="h-5 w-5" />}
            title="Demo Day record does not exist"
            description="Run `npm run seed` to create the six activities and their supporting records."
          />
        </Card>
      </>
    );
  }

  return <DemoDayClient activity={data.activity} demoDay={data.demoDay} students={students} />;
}
