import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Capstone, StartupConclave, SummerInternship } from "@/models";
import { badRequest, notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import {
  describeDriveError,
  driveConfigured,
  extractFolderId,
  folderUrl,
  listFolder,
} from "@/lib/drive";
import { HttpError } from "@/lib/auth";

export const runtime = "nodejs";

/** Browse a Drive folder so admin can see what is actually there before mapping. */
export const GET = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);

  const raw = new URL(req.url).searchParams.get("folder");
  if (!raw) throw badRequest("Provide a folder id or link.");

  const folderId = extractFolderId(raw);
  try {
    const files = await listFolder(folderId);
    return { folderId, folderUrl: folderUrl(folderId), files, driveConfigured };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const { status, message } = describeDriveError(err);
    throw new HttpError(status, message);
  }
});

const linkSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("internshipRoot"),
    id: z.string(),
    driveUrl: z.string().trim(),
  }),
  z.object({
    target: z.literal("internshipReport"),
    id: z.string(),
    reportId: z.string(),
    driveUrl: z.string().trim(),
  }),
  z.object({
    target: z.literal("capstoneRoot"),
    id: z.string(),
    driveUrl: z.string().trim(),
  }),
  z.object({
    target: z.literal("capstoneReport"),
    id: z.string(),
    reportId: z.string(),
    driveUrl: z.string().trim(),
  }),
  z.object({
    target: z.literal("capstoneExcel"),
    id: z.string(),
    driveUrl: z.string().trim(),
    fileName: z.string().trim().optional(),
  }),
  z.object({
    target: z.literal("conclaveRoot"),
    id: z.string(),
    driveUrl: z.string().trim(),
  }),
]);

/** Attach or clear the Drive folder behind a completed activity. */
export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = linkSchema.parse(await req.json());

  await connectDB();

  const resolved = body.driveUrl ? extractFolderId(body.driveUrl) : "";
  if (body.driveUrl && !resolved) throw badRequest("Could not read a Drive id from that link.");

  switch (body.target) {
    case "internshipRoot": {
      const doc = await SummerInternship.findById(body.id);
      if (!doc) throw notFound("Summer internship record not found.");
      doc.driveFolderId = resolved || null;
      doc.driveUrl = resolved ? folderUrl(resolved) : null;
      await doc.save();
      return doc.toObject();
    }
    case "internshipReport": {
      const doc = await SummerInternship.findById(body.id);
      if (!doc) throw notFound("Summer internship record not found.");
      const report = doc.reports.id(body.reportId);
      if (!report) throw notFound("Report folder not found.");
      report.driveFolderId = resolved || null;
      report.driveUrl = resolved ? folderUrl(resolved) : null;
      await doc.save();
      return doc.toObject();
    }
    case "capstoneRoot": {
      const doc = await Capstone.findById(body.id);
      if (!doc) throw notFound("Capstone record not found.");
      doc.driveFolderId = resolved || null;
      doc.driveUrl = resolved ? folderUrl(resolved) : null;
      await doc.save();
      return doc.toObject();
    }
    case "capstoneReport": {
      const doc = await Capstone.findById(body.id);
      if (!doc) throw notFound("Capstone record not found.");
      const report = doc.reports.id(body.reportId);
      if (!report) throw notFound("Report folder not found.");
      report.driveFolderId = resolved || null;
      report.driveUrl = resolved ? folderUrl(resolved) : null;
      await doc.save();
      return doc.toObject();
    }
    case "capstoneExcel": {
      const doc = await Capstone.findById(body.id);
      if (!doc) throw notFound("Capstone record not found.");
      doc.excelFile = resolved
        ? {
            driveFileId: resolved,
            fileName: body.fileName || "Capstone tracker",
            driveUrl: `https://drive.google.com/file/d/${resolved}/view`,
          }
        : { driveFileId: null, fileName: null, driveUrl: null };
      await doc.save();
      return doc.toObject();
    }
    case "conclaveRoot": {
      const doc = await StartupConclave.findById(body.id);
      if (!doc) throw notFound("Startup conclave record not found.");
      doc.driveFolderId = resolved || null;
      doc.driveUrl = resolved ? folderUrl(resolved) : null;
      await doc.save();
      return doc.toObject();
    }
  }
});
