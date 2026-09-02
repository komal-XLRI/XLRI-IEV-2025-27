import type { Metadata } from "next";
import { requirePageSession } from "@/lib/auth";
import { listStudentsWithUsers, listUsersByRole, listVentures } from "@/lib/queries";
import { VenturesClient } from "./ventures-client";

export const metadata: Metadata = { title: "Ventures" };
export const dynamic = "force-dynamic";

export default async function AdminVenturesPage() {
  await requirePageSession(["ADMIN"]);

  const [ventures, students, faculty, mentors] = await Promise.all([
    listVentures(),
    listStudentsWithUsers(),
    listUsersByRole("FACULTY"),
    listUsersByRole("MENTOR"),
  ]);

  return (
    <VenturesClient ventures={ventures} students={students} faculty={faculty} mentors={mentors} />
  );
}
