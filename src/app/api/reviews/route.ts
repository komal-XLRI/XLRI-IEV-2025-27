import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Mentoring } from "@/models";
import { notFound, withRoute } from "@/lib/api";
import { HttpError, requireApiSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  mentoringId: z.string().min(1),
  sessionId: z.string().min(1),
  rating: z.number().int().min(1, "Give a rating from 1 to 5.").max(5),
  feedback: z.string().trim().min(3, "Write a short piece of feedback.").max(4000),
});

/**
 * Faculty and mentor reviews. Each role writes only into its own review block,
 * and only for students assigned to them.
 */
export const POST = withRoute(async (req) => {
  const session = await requireApiSession(["FACULTY", "MENTOR"]);
  const body = schema.parse(await req.json());

  await connectDB();

  const mentoring = await Mentoring.findById(body.mentoringId);
  if (!mentoring) throw notFound("Mentoring activity not found.");

  const target = mentoring.sessions.id(body.sessionId);
  if (!target) throw notFound("Session not found.");

  const key = session.role === "FACULTY" ? "facultyId" : "mentorId";
  const isAssigned = (mentoring.assignments ?? []).some(
    (a: any) =>
      String(a.studentId) === String(target.studentId) &&
      String(a[key] ?? "") === String(session.userId),
  );

  if (!isAssigned) {
    throw new HttpError(403, "You are not assigned to this student.");
  }

  if (session.role === "FACULTY") {
    target.facultyReview = {
      facultyId: session.userId,
      rating: body.rating,
      feedback: body.feedback,
      reviewedAt: new Date(),
    };
  } else {
    target.mentorReview = {
      mentorId: session.userId,
      rating: body.rating,
      feedback: body.feedback,
      reviewedAt: new Date(),
    };
  }

  await mentoring.save();
  return { reviewed: true, role: session.role };
});
