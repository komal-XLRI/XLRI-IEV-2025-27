import { z } from "zod";
import { connectDB } from "@/lib/db";
import { ActivityResource } from "@/models";
import { notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { RESOURCE_CATEGORIES } from "@/lib/constants";

export const runtime = "nodejs";

const patchSchema = z.object({
  studentId: z.string().min(1).optional(),
  category: z.enum(RESOURCE_CATEGORIES).optional(),
});

export const PATCH = withRoute<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireApiSession(["ADMIN"]);
  const { id } = await ctx.params;
  const body = patchSchema.parse(await req.json());

  await connectDB();
  const resource = await ActivityResource.findByIdAndUpdate(id, body, { new: true }).lean<any>();
  if (!resource) throw notFound("Mapping not found.");
  return resource;
});

/** Removes the mapping only. The file itself stays untouched in Drive. */
export const DELETE = withRoute<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  await requireApiSession(["ADMIN"]);
  const { id } = await ctx.params;

  await connectDB();
  const resource = await ActivityResource.findByIdAndDelete(id);
  if (!resource) throw notFound("Mapping not found.");
  return { deleted: true };
});
