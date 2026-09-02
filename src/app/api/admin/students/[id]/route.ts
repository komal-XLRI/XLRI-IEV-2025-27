import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student } from "@/models";
import { notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  rollNumber: z.string().trim().min(1, "Roll number is required.").optional(),
  batch: z.string().trim().max(60).optional(),
  background: z.string().trim().max(4000).optional(),
  strengths: z.string().trim().max(4000).optional(),
  weakness: z.string().trim().max(4000).optional(),
});

export const PATCH = withRoute<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireApiSession(["ADMIN"]);
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());

  await connectDB();
  const student = await Student.findByIdAndUpdate(id, body, { new: true }).lean<any>();
  if (!student) throw notFound("Student not found.");
  return student;
});
