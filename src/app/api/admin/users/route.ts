import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student, User } from "@/models";
import { badRequest, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(ROLES),
  // Only meaningful when role is STUDENT.
  rollNumber: z.string().trim().optional(),
  batch: z.string().trim().optional(),
});

export const GET = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  await connectDB();

  const role = new URL(req.url).searchParams.get("role");
  const query = role && ROLES.includes(role as any) ? { role } : {};
  const users = await User.find(query).sort({ name: 1 }).lean();
  return users;
});

export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = createSchema.parse(await req.json());

  await connectDB();

  const existing = await User.findOne({ email: body.email });
  if (existing) throw badRequest("An account with that email already exists.");

  if (body.role === "STUDENT" && !body.rollNumber) {
    throw badRequest("A roll number is required for student accounts.");
  }

  const user = await User.create({
    name: body.name,
    email: body.email,
    role: body.role,
    status: "ACTIVE",
  });

  // A student account is only usable once its Student record exists, so both
  // are created together.
  if (body.role === "STUDENT") {
    await Student.create({
      userId: user._id,
      rollNumber: body.rollNumber,
      batch: body.batch ?? "",
    });
  }

  return user.toObject();
});
