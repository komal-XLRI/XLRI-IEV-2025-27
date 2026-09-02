import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student, StudentVenture, User } from "@/models";
import { badRequest, notFound, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const PATCH = withRoute<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const session = await requireApiSession(["ADMIN"]);
  const { id } = await ctx.params;
  const body = patchSchema.parse(await req.json());

  await connectDB();
  const user = await User.findById(id);
  if (!user) throw notFound("User not found.");

  // Guard against an admin locking themselves out.
  if (String(user._id) === session.userId) {
    if (body.role && body.role !== "ADMIN") {
      throw badRequest("You cannot change your own role away from Administrator.");
    }
    if (body.status === "INACTIVE") {
      throw badRequest("You cannot deactivate your own account.");
    }
  }

  if (body.email && body.email !== user.email) {
    const clash = await User.findOne({ email: body.email });
    if (clash) throw badRequest("Another account already uses that email.");
    user.email = body.email;
  }
  if (body.name) user.name = body.name;
  if (body.status) user.status = body.status;

  if (body.role && body.role !== user.role) {
    if (user.role === "STUDENT") {
      const hasStudent = await Student.exists({ userId: user._id });
      if (hasStudent) {
        throw badRequest(
          "This account has a student record. Delete the student record before changing the role.",
        );
      }
    }
    user.role = body.role;
  }

  await user.save();
  return user.toObject();
});

export const DELETE = withRoute<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const session = await requireApiSession(["ADMIN"]);
  const { id } = await ctx.params;

  if (id === session.userId) throw badRequest("You cannot delete your own account.");

  await connectDB();
  const user = await User.findById(id);
  if (!user) throw notFound("User not found.");

  if (user.role === "STUDENT") {
    const student = await Student.findOne({ userId: user._id });
    if (student) {
      const hasVenture = await StudentVenture.exists({ studentId: student._id });
      if (hasVenture) {
        throw badRequest(
          "This student has a venture. Remove the venture first so its activity records are not orphaned.",
        );
      }
      await student.deleteOne();
    }
  }

  await user.deleteOne();
  return { deleted: true };
});
