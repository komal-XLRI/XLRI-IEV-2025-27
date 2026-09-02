import "server-only";
import { connectDB } from "@/lib/db";
import { ActivityResource, DemoDay, Mentoring, Student } from "@/models";
import type { SessionPayload } from "@/lib/session";

/**
 * Single source of truth for "may this account read this Drive file?".
 *
 * Every route that returns file bytes or a Drive link for an individual file
 * goes through here. Nothing in the UI is trusted — a student who guesses a
 * Drive id still gets a 403, because ownership is looked up in MongoDB.
 */
export async function canAccessDriveFile(
  session: SessionPayload,
  driveFileId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  await connectDB();

  // Admin sees everything.
  if (session.role === "ADMIN") return { allowed: true };

  if (session.role === "STUDENT") {
    const student = await Student.findOne({ userId: session.userId }).select("_id").lean<any>();
    if (!student) return { allowed: false, reason: "No student profile linked to this account." };
    const studentId = student._id;

    // 1. Files mapped to this student for a completed activity.
    const mapped = await ActivityResource.exists({ studentId, driveFileId });
    if (mapped) return { allowed: true };

    // 2. Files the student uploaded to their own mentoring session.
    const ownMentoring = await Mentoring.exists({
      sessions: { $elemMatch: { studentId, "files.driveFileId": driveFileId } },
    });
    if (ownMentoring) return { allowed: true };

    // 3. The student's own Demo Day submission.
    const ownSubmission = await DemoDay.exists({
      rounds: { $elemMatch: { submissions: { $elemMatch: { studentId, driveFileId } } } },
    });
    if (ownSubmission) return { allowed: true };

    return { allowed: false, reason: "This file does not belong to you." };
  }

  if (session.role === "FACULTY" || session.role === "MENTOR") {
    const key = session.role === "FACULTY" ? "facultyId" : "mentorId";
    const mentoring = await Mentoring.findOne({
      [`assignments.${key}`]: session.userId,
    }).lean<any>();
    if (!mentoring) return { allowed: false, reason: "You have no assigned students." };

    const assigned = new Set(
      (mentoring.assignments ?? [])
        .filter((a: any) => String(a[key] ?? "") === String(session.userId))
        .map((a: any) => String(a.studentId)),
    );

    const owned = (mentoring.sessions ?? []).some(
      (s: any) =>
        assigned.has(String(s.studentId)) &&
        (s.files ?? []).some((f: any) => f.driveFileId === driveFileId),
    );

    return owned
      ? { allowed: true }
      : { allowed: false, reason: "This file belongs to a student who is not assigned to you." };
  }

  return { allowed: false, reason: "Not permitted." };
}

/** Resolves the caller's Student._id, or null when they are not a student. */
export async function resolveStudentId(session: SessionPayload): Promise<string | null> {
  if (session.role !== "STUDENT") return null;
  await connectDB();
  const student = await Student.findOne({ userId: session.userId }).select("_id").lean<any>();
  return student ? String(student._id) : null;
}
