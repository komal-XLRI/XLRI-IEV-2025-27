import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student, StudentVenture } from "@/models";
import { badRequest, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  studentId: z.string().min(1, "Choose a student."),
  ventureName: z.string().trim().min(2, "Enter the venture name."),
  industry: z.string().trim().max(120).optional(),
  problemStatement: z.string().trim().max(4000).optional(),
  solution: z.string().trim().max(4000).optional(),
  currentStage: z.string().trim().max(160).optional(),
  bottlenecks: z.string().trim().max(4000).optional(),
  resources: z.string().trim().max(4000).optional(),
  guidance: z.string().trim().max(4000).optional(),
  facultyId: z.string().optional().nullable(),
  mentorId: z.string().optional().nullable(),
});

export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = schema.parse(await req.json());

  await connectDB();

  const student = await Student.findById(body.studentId);
  if (!student) throw badRequest("That student does not exist.");

  // One venture per student, per the programme design.
  const existing = await StudentVenture.findOne({ studentId: body.studentId });
  if (existing) throw badRequest("This student already has a venture registered.");

  const venture = await StudentVenture.create({
    ...body,
    facultyId: body.facultyId || null,
    mentorId: body.mentorId || null,
  });
  return venture.toObject();
});
