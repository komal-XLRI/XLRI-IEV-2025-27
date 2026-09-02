import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Workshop } from "@/models";
import { badRequest, notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { extractFolderId, folderUrl } from "@/lib/drive";

export const runtime = "nodejs";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const sessionSchema = z.object({
  title: z.string().trim().min(2, "Enter a session title."),
  date: z.string().optional().nullable(),
  startTime: z.string().regex(timePattern).optional().or(z.literal("")),
  endTime: z.string().regex(timePattern).optional().or(z.literal("")),
  speaker: z.string().trim().max(160).optional(),
  venue: z.string().trim().max(160).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    workshopId: z.string(),
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().max(4000).optional(),
  }),
  z.object({ action: z.literal("addSession"), workshopId: z.string(), session: sessionSchema }),
  z.object({
    action: z.literal("updateSession"),
    workshopId: z.string(),
    sessionId: z.string(),
    session: sessionSchema,
  }),
  z.object({ action: z.literal("deleteSession"), workshopId: z.string(), sessionId: z.string() }),
  z.object({
    action: z.literal("setAttendance"),
    workshopId: z.string(),
    sessionId: z.string(),
    entries: z.array(
      z.object({
        studentId: z.string(),
        attendance: z.enum(["PRESENT", "ABSENT", "EXCUSED"]),
      }),
    ),
  }),
  z.object({
    action: z.literal("addReport"),
    workshopId: z.string(),
    title: z.string().trim().min(1, "Enter a report title."),
    driveUrl: z.string().trim().min(5, "Paste the Drive folder link or id."),
  }),
  z.object({ action: z.literal("deleteReport"), workshopId: z.string(), reportId: z.string() }),
]);

export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = bodySchema.parse(await req.json());

  await connectDB();
  const workshop = await Workshop.findById(body.workshopId);
  if (!workshop) throw notFound("Workshop not found.");

  switch (body.action) {
    case "update": {
      if (body.title) workshop.title = body.title;
      if (body.description !== undefined) workshop.description = body.description;
      break;
    }

    case "addSession": {
      workshop.sessions.push(normaliseSession(body.session));
      break;
    }

    case "updateSession": {
      const session = workshop.sessions.id(body.sessionId);
      if (!session) throw notFound("Session not found.");
      Object.assign(session, normaliseSession(body.session));
      break;
    }

    case "deleteSession": {
      const session = workshop.sessions.id(body.sessionId);
      if (!session) throw notFound("Session not found.");
      session.deleteOne();
      break;
    }

    case "setAttendance": {
      const session = workshop.sessions.id(body.sessionId);
      if (!session) throw notFound("Session not found.");
      // Replace wholesale — the UI always submits the full roster.
      session.participants = body.entries.map((e) => ({
        studentId: e.studentId,
        attendance: e.attendance,
      }));
      break;
    }

    case "addReport": {
      const folderId = extractFolderId(body.driveUrl);
      if (!folderId) throw badRequest("Could not read a Drive folder id from that link.");
      workshop.reports.push({
        title: body.title,
        driveFolderId: folderId,
        driveUrl: folderUrl(folderId),
      });
      break;
    }

    case "deleteReport": {
      const report = workshop.reports.id(body.reportId);
      if (!report) throw notFound("Report not found.");
      report.deleteOne();
      break;
    }
  }

  await workshop.save();
  return workshop.toObject();
});

function normaliseSession(session: z.infer<typeof sessionSchema>) {
  return {
    title: session.title,
    date: session.date ? new Date(session.date) : null,
    startTime: session.startTime || null,
    endTime: session.endTime || null,
    speaker: session.speaker ?? "",
    venue: session.venue ?? "",
  };
}
