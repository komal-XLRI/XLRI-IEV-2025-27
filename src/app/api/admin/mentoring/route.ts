import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Mentoring, Student, User } from "@/models";
import { badRequest, notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";

export const runtime = "nodejs";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setAssignment"),
    mentoringId: z.string(),
    studentId: z.string(),
    facultyId: z.string().optional().nullable(),
    mentorId: z.string().optional().nullable(),
  }),
  z.object({
    action: z.literal("removeAssignment"),
    mentoringId: z.string(),
    studentId: z.string(),
  }),
  z.object({
    action: z.literal("addSession"),
    mentoringId: z.string(),
    studentId: z.string(),
    date: z.string().optional().nullable(),
    startTime: z.string().regex(timePattern).optional().or(z.literal("")),
    endTime: z.string().regex(timePattern).optional().or(z.literal("")),
    topic: z.string().trim().max(300).optional(),
  }),
  z.object({
    action: z.literal("updateSession"),
    mentoringId: z.string(),
    sessionId: z.string(),
    date: z.string().optional().nullable(),
    startTime: z.string().regex(timePattern).optional().or(z.literal("")),
    endTime: z.string().regex(timePattern).optional().or(z.literal("")),
    topic: z.string().trim().max(300).optional(),
  }),
  z.object({
    action: z.literal("deleteSession"),
    mentoringId: z.string(),
    sessionId: z.string(),
  }),
]);

export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = bodySchema.parse(await req.json());

  await connectDB();
  const mentoring = await Mentoring.findById(body.mentoringId);
  if (!mentoring) throw notFound("Mentoring activity not found.");

  switch (body.action) {
    case "setAssignment": {
      const student = await Student.findById(body.studentId);
      if (!student) throw badRequest("That student does not exist.");

      if (body.facultyId) await assertRole(body.facultyId, "FACULTY");
      if (body.mentorId) await assertRole(body.mentorId, "MENTOR");

      const existing = mentoring.assignments.find(
        (a: any) => String(a.studentId) === body.studentId,
      );
      if (existing) {
        existing.facultyId = body.facultyId || null;
        existing.mentorId = body.mentorId || null;
      } else {
        mentoring.assignments.push({
          studentId: body.studentId,
          facultyId: body.facultyId || null,
          mentorId: body.mentorId || null,
        });
      }
      break;
    }

    case "removeAssignment": {
      mentoring.assignments = mentoring.assignments.filter(
        (a: any) => String(a.studentId) !== body.studentId,
      );
      break;
    }

    case "addSession": {
      const student = await Student.findById(body.studentId);
      if (!student) throw badRequest("That student does not exist.");
      mentoring.sessions.push({
        studentId: body.studentId,
        date: body.date ? new Date(body.date) : null,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        topic: body.topic ?? "",
      });
      break;
    }

    case "updateSession": {
      const session = mentoring.sessions.id(body.sessionId);
      if (!session) throw notFound("Session not found.");
      if (body.date !== undefined) session.date = body.date ? new Date(body.date) : null;
      if (body.startTime !== undefined) session.startTime = body.startTime || null;
      if (body.endTime !== undefined) session.endTime = body.endTime || null;
      if (body.topic !== undefined) session.topic = body.topic;
      break;
    }

    case "deleteSession": {
      const session = mentoring.sessions.id(body.sessionId);
      if (!session) throw notFound("Session not found.");
      session.deleteOne();
      break;
    }
  }

  await mentoring.save();
  return mentoring.toObject();
});

async function assertRole(userId: string, role: "FACULTY" | "MENTOR") {
  const user = await User.findById(userId).select("role").lean<any>();
  if (!user || user.role !== role) {
    throw badRequest(`The selected ${role.toLowerCase()} is not a valid ${role.toLowerCase()} account.`);
  }
}
