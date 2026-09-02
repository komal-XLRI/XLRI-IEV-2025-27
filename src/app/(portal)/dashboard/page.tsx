import type { Metadata } from "next";
import { requirePageSession } from "@/lib/auth";
import { AdminDashboard } from "./admin-dashboard";
import { StudentDashboard } from "./student-dashboard";
import { ReviewerDashboard } from "./reviewer-dashboard";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requirePageSession();

  if (session.role === "ADMIN") return <AdminDashboard />;
  if (session.role === "FACULTY" || session.role === "MENTOR") {
    return <ReviewerDashboard userId={session.userId} role={session.role} name={session.name} />;
  }
  return <StudentDashboard userId={session.userId} name={session.name} />;
}
