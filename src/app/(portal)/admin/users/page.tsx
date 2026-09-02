import type { Metadata } from "next";
import { requirePageSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Student, User } from "@/models";
import { serialize } from "@/lib/api";
import { UsersClient } from "./users-client";

export const metadata: Metadata = { title: "Users & Roles" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requirePageSession(["ADMIN"]);
  await connectDB();

  const [users, students] = await Promise.all([
    User.find().sort({ role: 1, name: 1 }).lean(),
    Student.find().select("userId rollNumber batch").lean(),
  ]);

  const studentByUser = new Map(students.map((s: any) => [String(s.userId), s]));

  const rows = serialize(
    users.map((u: any) => ({
      ...u,
      rollNumber: studentByUser.get(String(u._id))?.rollNumber ?? null,
      batch: studentByUser.get(String(u._id))?.batch ?? null,
    })),
  );

  return <UsersClient users={rows} currentUserId={session.userId} />;
}
