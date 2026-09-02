import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePageSession } from "@/lib/auth";
import { getReviewerWorkload } from "@/lib/queries";
import { ReviewsClient } from "./reviews-client";

export const metadata: Metadata = { title: "Mentoring Reviews" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const session = await requirePageSession(["FACULTY", "MENTOR"]);
  const workload = await getReviewerWorkload(
    session.userId,
    session.role as "FACULTY" | "MENTOR",
  );

  if (!workload.mentoringId) {
    return (
      <>
        <PageHeader title="Mentoring reviews" />
        <Card>
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Mentoring is not set up yet"
            description="Once the IEV office configures mentoring and assigns you students, their sessions appear here."
          />
        </Card>
      </>
    );
  }

  return (
    <ReviewsClient
      role={session.role as "FACULTY" | "MENTOR"}
      mentoringId={workload.mentoringId}
      sessions={workload.sessions}
      students={workload.students}
    />
  );
}
