import { withRoute, badRequest } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { checkFolderAccess, driveConfigured, serviceAccountEmail } from "@/lib/drive";

export const runtime = "nodejs";

/**
 * Diagnostic for the admin Drive page.
 *
 * "Configured" and "can actually reach the folders" are different things, and
 * conflating them is the confusing part of service-account setup: the portal
 * looks connected while every scan comes back empty. This answers the second
 * question directly.
 */
export const GET = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);

  const folder = new URL(req.url).searchParams.get("folder");
  if (!folder) throw badRequest("Paste a Drive folder link or id to test.");

  const result = await checkFolderAccess(folder);
  return { ...result, driveConfigured, serviceAccountEmail };
});
