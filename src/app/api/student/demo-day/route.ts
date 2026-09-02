import { connectDB } from "@/lib/db";
import { DemoDay, VentureActivity } from "@/models";
import { badRequest, notFound, withRoute } from "@/lib/api";
import { HttpError, requireApiStudent } from "@/lib/auth";
import { driveConfigured, uploadFile } from "@/lib/drive";

export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024;

const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/** Student submits their own PPT for a Demo Day round. */
export const POST = withRoute(async (req) => {
  const { student } = await requireApiStudent();

  const form = await req.formData();
  const roundId = String(form.get("roundId") ?? "");
  const file = form.get("file");

  if (!roundId) throw badRequest("roundId is required.");
  if (!(file instanceof File)) throw badRequest("Attach a file to upload.");
  if (file.size === 0) throw badRequest("That file is empty.");
  if (file.size > MAX_BYTES) throw badRequest("Files must be 50 MB or smaller.");
  if (!ALLOWED.has(file.type)) throw badRequest("Only PDF, PPT and PPTX files are accepted.");

  await connectDB();

  const activity = await VentureActivity.findOne({ type: "DEMO_DAY", ventureId: null }).lean<any>();
  if (!activity) throw notFound("Demo Day is not set up yet.");

  const demoDay = await DemoDay.findOne({ activityId: activity._id });
  if (!demoDay) throw notFound("Demo Day is not set up yet.");

  const round = demoDay.rounds.id(roundId);
  if (!round) throw notFound("Round not found.");

  // The submission window is admin controlled — checked on the server.
  if (!round.submissionsOpen) {
    throw new HttpError(403, "Submissions for this round are closed.");
  }
  if (!round.driveFolderId) {
    throw new HttpError(503, "This round has no Drive folder configured yet.");
  }
  if (!driveConfigured) {
    throw new HttpError(
      503,
      "Google Drive is not configured on this server, so submissions are unavailable. Contact the IEV office.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile({
    folderId: round.driveFolderId,
    fileName: `${student.rollNumber ?? "student"}_${round.type}_${file.name}`,
    mimeType: file.type,
    buffer,
  });

  // Re-submitting replaces the previous entry rather than stacking duplicates.
  const existing = round.submissions.find(
    (s: any) => String(s.studentId) === String(student._id),
  );

  if (existing) {
    existing.driveFileId = uploaded.id;
    existing.fileName = file.name;
    existing.fileType = file.type;
    existing.driveUrl = uploaded.webViewLink;
    existing.submittedAt = new Date();
    existing.status = "SUBMITTED";
  } else {
    round.submissions.push({
      studentId: student._id,
      driveFileId: uploaded.id,
      fileName: file.name,
      fileType: file.type,
      driveUrl: uploaded.webViewLink,
      submittedAt: new Date(),
      status: "SUBMITTED",
    });
  }

  await demoDay.save();
  return { fileName: file.name, driveFileId: uploaded.id, replaced: Boolean(existing) };
});
