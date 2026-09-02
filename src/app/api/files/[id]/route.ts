import { NextResponse } from "next/server";
import { withRoute } from "@/lib/api";
import { HttpError, requireApiSession } from "@/lib/auth";
import { canAccessDriveFile } from "@/lib/file-access";
import { describeDriveError, downloadFile, driveConfigured } from "@/lib/drive";

export const runtime = "nodejs";

/**
 * Streams a Drive file through the portal.
 *
 * The Drive folders stay private; this route is the only way a student reaches
 * a file, and it refuses anything they do not own. `?download=1` forces a save
 * dialog instead of inline preview.
 */
export const GET = withRoute<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const session = await requireApiSession();
  const { id } = await ctx.params;

  const { allowed, reason } = await canAccessDriveFile(session, id);
  if (!allowed) throw new HttpError(403, reason ?? "You cannot access this file.");

  if (!driveConfigured) {
    throw new HttpError(
      503,
      "Google Drive is not configured on this server, so the file cannot be streamed.",
    );
  }

  let meta, stream;
  try {
    ({ meta, stream } = await downloadFile(id));
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // The mapping exists but Drive cannot serve the file — usually deleted,
    // moved out of the shared folder, or never shared with the service account.
    const described = describeDriveError(err);
    throw new HttpError(
      described.status === 404 ? 404 : described.status,
      described.status === 404
        ? "This file is no longer available in Google Drive. It may have been moved or deleted — please contact the IEV office."
        : described.message,
    );
  }

  const wantsDownload = new URL(req.url).searchParams.get("download") === "1";

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": meta.mimeType || "application/octet-stream",
      "Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(
        meta.name,
      )}"`,
      // Private per-user content — never let a shared cache hold it.
      "Cache-Control": "private, no-store",
    },
  });
});
