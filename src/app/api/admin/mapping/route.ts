import { z } from "zod";
import { connectDB } from "@/lib/db";
import { ActivityResource, Student, VentureActivity } from "@/models";
import { badRequest, notFound, withRoute } from "@/lib/api";
import { HttpError, requireApiSession } from "@/lib/auth";
import {
  describeDriveError,
  driveConfigured,
  extractFolderId,
  fileUrl,
  getFileMeta,
  listFolder,
} from "@/lib/drive";
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_LABELS } from "@/lib/constants";

export const runtime = "nodejs";

/** Existing mappings for an activity, so the UI can show what is already assigned. */
export const GET = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  await connectDB();

  const activityId = new URL(req.url).searchParams.get("activityId");
  if (!activityId) throw badRequest("activityId is required.");

  const resources = await ActivityResource.find({ activityId })
    .populate({ path: "studentId", populate: { path: "userId", select: "name email" } })
    .sort({ fileName: 1 })
    .lean();

  return resources;
});

const mapSchema = z.object({
  activityId: z.string().min(1),
  assignments: z
    .array(
      z.object({
        studentId: z.string().min(1),
        // Either the id + name (from a folder scan) or a pasted Drive link.
        driveFileId: z.string().optional(),
        fileName: z.string().optional(),
        driveUrl: z.string().optional(),
        fileType: z.string().optional(),
        category: z.enum(RESOURCE_CATEGORIES).default("OTHER"),
      }),
    )
    .min(1, "Select at least one file to assign."),
});

/**
 * Assign Drive files to students. Upserting on (activityId, driveFileId) means
 * re-running the mapping just corrects the owner rather than duplicating rows.
 */
export const POST = withRoute(async (req) => {
  const session = await requireApiSession(["ADMIN"]);
  const body = mapSchema.parse(await req.json());

  await connectDB();

  const activity = await VentureActivity.findById(body.activityId);
  if (!activity) throw notFound("Activity not found.");

  const studentIds = [...new Set(body.assignments.map((a) => a.studentId))];
  const found = await Student.find({ _id: { $in: studentIds } }).select("_id").lean<any[]>();
  if (found.length !== studentIds.length) {
    throw badRequest("One or more selected students no longer exist.");
  }

  // Resolve each assignment to a concrete Drive file id and a display name.
  const resolved = await Promise.all(
    body.assignments.map(async (a) => {
      const driveFileId = a.driveFileId || (a.driveUrl ? extractFolderId(a.driveUrl) : "");
      if (!driveFileId) {
        throw badRequest("Every assignment needs a Drive file link or id.");
      }

      let fileName = a.fileName?.trim() ?? "";
      let fileType = a.fileType ?? "";

      // A pasted link carries no name; ask Drive for it when we can, and fall
      // back to something readable rather than showing a raw id to students.
      if (!fileName) {
        if (driveConfigured) {
          try {
            const meta = await getFileMeta(driveFileId);
            fileName = meta.name;
            fileType = fileType || meta.mimeType;
          } catch {
            /* unreachable file — fall through to the generated name */
          }
        }
        if (!fileName) {
          fileName = `${RESOURCE_CATEGORY_LABELS[a.category] ?? "Document"}`;
        }
      }

      return { ...a, driveFileId, fileName, fileType };
    }),
  );

  const ops = resolved.map((a) => ({
    updateOne: {
      filter: { activityId: body.activityId, driveFileId: a.driveFileId },
      update: {
        $set: {
          activityId: body.activityId,
          studentId: a.studentId,
          category: a.category,
          driveFileId: a.driveFileId,
          fileName: a.fileName,
          fileType: a.fileType,
          driveUrl: fileUrl(a.driveFileId),
          access: "VIEW",
          mappedBy: session.userId,
        },
      },
      upsert: true,
    },
  }));

  const result = await ActivityResource.bulkWrite(ops);
  return {
    assigned: resolved.length,
    inserted: result.upsertedCount ?? 0,
    updated: result.modifiedCount ?? 0,
  };
});

const deleteSchema = z.union([
  z.object({
    ids: z
      .array(z.string().min(1))
      .min(1, "Select at least one mapping to remove.")
      .max(1000, "Remove at most 1000 mappings at a time."),
  }),
  z.object({ activityId: z.string().min(1), all: z.literal(true) }),
]);

/**
 * Bulk-removes mappings — the undo for a mis-run folder scan.
 *
 * Only the ownership records go; the files themselves are untouched in Drive.
 * Students lose access the moment the record disappears, because every read is
 * authorised against this table.
 */
export const DELETE = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);

  const body = deleteSchema.parse(await req.json().catch(() => ({})));
  await connectDB();

  if ("all" in body) {
    const activity = await VentureActivity.findById(body.activityId);
    if (!activity) throw notFound("Activity not found.");
    const result = await ActivityResource.deleteMany({ activityId: body.activityId });
    return { deleted: result.deletedCount ?? 0, scope: "activity" as const };
  }

  const result = await ActivityResource.deleteMany({ _id: { $in: body.ids } });
  return { deleted: result.deletedCount ?? 0, scope: "selection" as const };
});

const suggestSchema = z.object({
  folder: z.string().min(1, "Provide the Drive folder link or id."),
  activityId: z.string().min(1),
});

/**
 * Reads a Drive folder and guesses the owner of each file by matching the file
 * name against student names and roll numbers. Admin always confirms before
 * anything is written.
 */
export const PUT = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = suggestSchema.parse(await req.json());

  await connectDB();

  const folderId = extractFolderId(body.folder);

  let files;
  try {
    files = (await listFolder(folderId)).filter((f) => !f.isFolder);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const { status, message } = describeDriveError(err);
    throw new HttpError(status, message);
  }

  const students = await Student.find().populate("userId", "name email").lean<any[]>();
  const existing = await ActivityResource.find({ activityId: body.activityId })
    .select("driveFileId studentId")
    .lean<any[]>();
  const alreadyMapped = new Map(existing.map((r) => [r.driveFileId, String(r.studentId)]));

  const candidates = students.map((s) => ({
    studentId: String(s._id),
    name: String(s.userId?.name ?? ""),
    rollNumber: String(s.rollNumber ?? ""),
    tokens: tokenise(String(s.userId?.name ?? "")),
  }));

  const suggestions = files.map((file) => {
    const haystack = normalise(file.name);
    let best: { studentId: string; score: number } | null = null;

    for (const c of candidates) {
      let score = 0;
      if (c.rollNumber && haystack.includes(normalise(c.rollNumber))) score += 10;
      for (const token of c.tokens) {
        if (token.length >= 3 && haystack.includes(token)) score += token.length >= 5 ? 3 : 2;
      }
      if (score > 0 && (!best || score > best.score)) best = { studentId: c.studentId, score };
    }

    return {
      driveFileId: file.id,
      fileName: file.name,
      fileType: file.mimeType,
      size: file.size ?? null,
      suggestedStudentId: best?.score && best.score >= 3 ? best.studentId : null,
      confidence: best?.score ?? 0,
      currentStudentId: alreadyMapped.get(file.id) ?? null,
    };
  });

  return { folderId, fileCount: files.length, suggestions };
});

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

function tokenise(name: string) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
