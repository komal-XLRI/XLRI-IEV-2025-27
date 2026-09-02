import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getMentoring, listStudentsWithUsers, listUsersByRole } from "@/lib/queries";
import { MentoringClient } from "./mentoring-client";

export const metadata: Metadata = { title: "Mentoring" };
export const dynamic = "force-dynamic";

export default async function AdminMentoringPage() {
  await requirePageSession(["ADMIN"]);

  const [data, students, faculty, mentors] = await Promise.all([
    getMentoring(),
    listStudentsWithUsers(),
    listUsersByRole("FACULTY"),
    listUsersByRole("MENTOR"),
  ]);

  if (!data?.mentoring) {
    return (
      <>
        <PageHeader title="Mentoring" breadcrumb="Admin" />
        <Card>
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Mentoring record does not exist"
            description="Run `npm run seed` to create the six activities and their supporting records."
          />
        </Card>
      </>
    );
  }

  return (
    <MentoringClient
      activity={data.activity}
      mentoring={data.mentoring}
      students={students}
      faculty={faculty}
      mentors={mentors}
    />
  );
}
