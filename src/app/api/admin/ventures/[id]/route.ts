import { z } from "zod";
import { connectDB } from "@/lib/db";
import { StudentVenture } from "@/models";
import { notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  ventureName: z.string().trim().min(2).optional(),
  industry: z.string().trim().max(120).optional(),
  problemStatement: z.string().trim().max(4000).optional(),
  solution: z.string().trim().max(4000).optional(),
  facultyId: z.string().optional().nullable(),
  mentorId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const PATCH = withRoute<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireApiSession(["ADMIN"]);
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());

  await connectDB();
  const venture = await StudentVenture.findById(id);
  if (!venture) throw notFound("Venture not found.");

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (key === "facultyId" || key === "mentorId") {
      (venture as any)[key] = value || null;
    } else {
      (venture as any)[key] = value;
    }
  }

  await venture.save();
  return venture.toObject();
});

export const DELETE = withRoute<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  await requireApiSession(["ADMIN"]);
  const { id } = await ctx.params;
  await connectDB();
  const venture = await StudentVenture.findByIdAndDelete(id);
  if (!venture) throw notFound("Venture not found.");
  return { deleted: true };
});
