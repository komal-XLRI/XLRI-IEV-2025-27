import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ActivityResource, Capstone, StartupConclave, SummerInternship, VentureActivity } from "@/models";
import { serialize } from "@/lib/api";
import { driveConfigured, serviceAccountEmail } from "@/lib/drive";
import { listStudentsWithUsers } from "@/lib/queries";
import { ACTIVITY_LABELS, SLUG_TO_TYPE, type CompletedSlug } from "@/lib/constants";
import { CompletedActivityClient } from "./completed-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const type = SLUG_TO_TYPE[slug as CompletedSlug];
  return { title: type ? ACTIVITY_LABELS[type] : "Completed activity" };
}

export default async function CompletedActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePageSession(["ADMIN"]);

  const { slug } = await params;
  const type = SLUG_TO_TYPE[slug as CompletedSlug];
  if (!type) notFound();

  await connectDB();
  const activity = await VentureActivity.findOne({ type, ventureId: null }).lean<any>();
  if (!activity) notFound();

  // Each completed activity keeps its Drive folders in its own collection.
  const detail =
    type === "SUMMER_INTERNSHIP"
      ? await SummerInternship.findOne({ activityId: activity._id }).lean<any>()
      : type === "CAPSTONE"
        ? await Capstone.findOne({ activityId: activity._id }).lean<any>()
        : await StartupConclave.findOne({ activityId: activity._id }).lean<any>();

  const [students, resources] = await Promise.all([
    listStudentsWithUsers(),
    ActivityResource.find({ activityId: activity._id })
      .sort({ category: 1, fileName: 1 })
      .lean<any[]>(),
  ]);

  return (
    <CompletedActivityClient
      slug={slug as CompletedSlug}
      type={type}
      activity={serialize(activity)}
      detail={detail ? serialize(detail) : null}
      students={students}
      resources={serialize(resources)}
      driveConfigured={driveConfigured}
      serviceAccountEmail={serviceAccountEmail}
    />
  );
}
