import type { Metadata } from "next";
import { requirePageSession } from "@/lib/auth";
import { listActivities, listStudentsWithUsers } from "@/lib/queries";
import { driveConfigured } from "@/lib/drive";
import { MappingClient } from "./mapping-client";

export const metadata: Metadata = { title: "File Mapping" };
export const dynamic = "force-dynamic";

export default async function AdminMappingPage() {
  await requirePageSession(["ADMIN"]);
  const [activities, students] = await Promise.all([listActivities(), listStudentsWithUsers()]);

  return (
    <MappingClient
      activities={activities}
      students={students}
      driveConfigured={driveConfigured}
    />
  );
}
