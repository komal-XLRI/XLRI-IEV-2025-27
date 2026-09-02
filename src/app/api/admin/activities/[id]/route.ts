import { z } from "zod";
import { connectDB } from "@/lib/db";
import { VentureActivity } from "@/models";
import { notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { ACTIVITY_STATUSES } from "@/lib/constants";

export const runtime = "nodejs";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  // Dates are never hard-coded — admin owns them, and may clear them.
  date: z.string().optional().nullable(),
  startTime: z.string().regex(timePattern, "Use HH:MM.").optional().nullable().or(z.literal("")),
  endTime: z.string().regex(timePattern, "Use HH:MM.").optional().nullable().or(z.literal("")),
  status: z.enum(ACTIVITY_STATUSES).optional(),
});

export const PATCH = withRoute<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireApiSession(["ADMIN"]);
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());

  await connectDB();
  const activity = await VentureActivity.findById(id);
  if (!activity) throw notFound("Activity not found.");

  if (body.name !== undefined) activity.name = body.name;
  if (body.description !== undefined) activity.description = body.description ?? "";
  if (body.date !== undefined) activity.date = body.date ? new Date(body.date) : null;
  if (body.startTime !== undefined) activity.startTime = body.startTime || null;
  if (body.endTime !== undefined) activity.endTime = body.endTime || null;
  if (body.status !== undefined) activity.status = body.status;

  await activity.save();
  return activity.toObject();
});
