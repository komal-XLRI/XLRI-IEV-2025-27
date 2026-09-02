import { connectDB } from "@/lib/db";
import { Mentoring, VentureActivity } from "@/models";
import { badRequest, notFound, withRoute } from "@/lib/api";
import { HttpError, requireApiStudent } from "@/lib/auth";
import { createFolder, driveConfigured, uploadFile } from "@/lib/drive";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/** Student uploads a PPT/PDF against one of their own mentoring sessions. */
export const POST = withRoute(async (req) => {
  const { student } = await requireApiStudent();

  const form = await req.formData();
  const sessionId = String(form.get("sessionId") ?? "");
  const file = form.get("file");

  if (!sessionId) throw badRequest("sessionId is required.");
  if (!(file instanceof File)) throw badRequest("Attach a file to upload.");
  if (file.size === 0) throw badRequest("That file is empty.");
  if (file.size > MAX_BYTES) throw badRequest("Files must be 25 MB or smaller.");
  if (!ALLOWED.has(file.type)) throw badRequest("Only PDF, PPT and PPTX files are accepted.");

  await connectDB();

  const activity = await VentureActivity.findOne({ type: "MENTORING", ventureId: null }).lean<any>();
  if (!activity) throw notFound("Mentoring activity is not set up yet.");

  // Completed activities are immutable for students — enforced here, not just
  // by hiding the upload button.
  if (activity.status === "COMPLETED") {
    throw new HttpError(403, "Mentoring is closed. Uploads are no longer accepted.");
  }

  const mentoring = await Mentoring.findOne({ activityId: activity._id });
  if (!mentoring) throw notFound("Mentoring activity is not set up yet.");

  const session = mentoring.sessions.id(sessionId);
  if (!session) throw notFound("Session not found.");

  // Ownership check: a student may only upload to their own session.
  if (String(session.studentId) !== String(student._id)) {
    throw new HttpError(403, "That session does not belong to you.");
  }

  if (!driveConfigured) {
    throw new HttpError(
      503,
      "Google Drive is not configured on this server, so uploads are unavailable. Contact the IEV office.",
    );
  }

  // Each student gets their own folder so raw Drive access never spans students.
  const folder = await createFolder(
    `Mentoring — ${student.rollNumber ?? String(student._id)}`,
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  );

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile({
    folderId: folder.id,
    fileName: `${student.rollNumber ?? "student"}_${Date.now()}_${file.name}`,
    mimeType: file.type,
    buffer,
  });

  session.files.push({
    driveFileId: uploaded.id,
    fileName: file.name,
    fileType: file.type,
    driveUrl: uploaded.webViewLink,
    uploadedAt: new Date(),
  });

  await mentoring.save();
  return { fileName: file.name, driveFileId: uploaded.id };
});
