import type { Metadata } from "next";
import { Presentation } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getWorkshop, listStudentsWithUsers } from "@/lib/queries";
import { WorkshopClient } from "./workshop-client";

export const metadata: Metadata = { title: "Workshops" };
export const dynamic = "force-dynamic";

export default async function AdminWorkshopsPage() {
  await requirePageSession(["ADMIN"]);
  const [data, students] = await Promise.all([getWorkshop(), listStudentsWithUsers()]);

  if (!data?.workshop) {
    return (
      <>
        <PageHeader title="Workshops" breadcrumb="Admin" />
        <Card>
          <EmptyState
            icon={<Presentation className="h-5 w-5" />}
            title="Workshop record does not exist"
            description="Run `npm run seed` to create the six activities and their supporting records."
          />
        </Card>
      </>
    );
  }

  return (
    <WorkshopClient activity={data.activity} workshop={data.workshop} students={students} />
  );
}
