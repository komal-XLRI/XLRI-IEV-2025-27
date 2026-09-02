import type { Metadata } from "next";
import { requirePageSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ActivityResource, Student, StudentVenture } from "@/models";
import { serialize } from "@/lib/api";
import { StudentsClient } from "./students-client";

export const metadata: Metadata = { title: "Students" };
export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  await requirePageSession(["ADMIN"]);
  await connectDB();

  const students = await Student.find().populate("userId", "name email status").lean<any[]>();
  const ventures = await StudentVenture.find().select("studentId ventureName").lean<any[]>();
  const resourceCounts = await ActivityResource.aggregate([
    { $group: { _id: "$studentId", count: { $sum: 1 } } },
  ]);

  const ventureByStudent = new Map(ventures.map((v) => [String(v.studentId), v.ventureName]));
  const countByStudent = new Map(resourceCounts.map((r: any) => [String(r._id), r.count]));

  const rows = serialize(
    students
      .map((s) => ({
        ...s,
        ventureName: ventureByStudent.get(String(s._id)) ?? null,
        resourceCount: countByStudent.get(String(s._id)) ?? 0,
      }))
      .sort((a, b) => (a.userId?.name ?? "").localeCompare(b.userId?.name ?? "")),
  );

  return <StudentsClient students={rows} />;
}
