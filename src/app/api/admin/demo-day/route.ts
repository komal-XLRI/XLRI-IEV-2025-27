import { z } from "zod";
import { connectDB } from "@/lib/db";
import { DemoDay } from "@/models";
import { badRequest, notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { extractFolderId, folderUrl } from "@/lib/drive";
import { DEMO_ROUND_TYPES } from "@/lib/constants";

export const runtime = "nodejs";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("updateRound"),
    demoDayId: z.string(),
    roundId: z.string(),
    // Dates come from admin only — no defaults, no hard-coded months.
    date: z.string().optional().nullable(),
    startTime: z.string().regex(timePattern).optional().or(z.literal("")),
    endTime: z.string().regex(timePattern).optional().or(z.literal("")),
    submissionsOpen: z.boolean().optional(),
    driveUrl: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("addRound"),
    demoDayId: z.string(),
    type: z.enum(DEMO_ROUND_TYPES),
  }),
  z.object({
    action: z.literal("setSubmissionStatus"),
    demoDayId: z.string(),
    roundId: z.string(),
    submissionId: z.string(),
    status: z.enum(["SUBMITTED", "REVIEWED", "REJECTED"]),
  }),
]);

export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = bodySchema.parse(await req.json());

  await connectDB();
  const demoDay = await DemoDay.findById(body.demoDayId);
  if (!demoDay) throw notFound("Demo Day activity not found.");

  switch (body.action) {
    case "updateRound": {
      const round = demoDay.rounds.id(body.roundId);
      if (!round) throw notFound("Round not found.");

      if (body.date !== undefined) round.date = body.date ? new Date(body.date) : null;
      if (body.startTime !== undefined) round.startTime = body.startTime || null;
      if (body.endTime !== undefined) round.endTime = body.endTime || null;
      if (body.submissionsOpen !== undefined) round.submissionsOpen = body.submissionsOpen;

      if (body.driveUrl !== undefined) {
        if (body.driveUrl === "") {
          round.driveFolderId = null;
          round.driveUrl = null;
        } else {
          const folderId = extractFolderId(body.driveUrl);
          if (!folderId) throw badRequest("Could not read a Drive folder id from that link.");
          round.driveFolderId = folderId;
          round.driveUrl = folderUrl(folderId);
        }
      }

      if (round.submissionsOpen && !round.driveFolderId) {
        throw badRequest(
          "Set the Drive folder for this round before opening it — uploads need somewhere to go.",
        );
      }
      break;
    }

    case "addRound": {
      if (demoDay.rounds.some((r: any) => r.type === body.type)) {
        throw badRequest("That round already exists.");
      }
      demoDay.rounds.push({ type: body.type, submissionsOpen: false });
      break;
    }

    case "setSubmissionStatus": {
      const round = demoDay.rounds.id(body.roundId);
      if (!round) throw notFound("Round not found.");
      const submission = round.submissions.id(body.submissionId);
      if (!submission) throw notFound("Submission not found.");
      submission.status = body.status;
      break;
    }
  }

  await demoDay.save();
  return demoDay.toObject();
});
