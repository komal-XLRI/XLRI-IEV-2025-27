import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Otp, User } from "@/models";
import { withRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import { isMasterOtp, logMasterOtpUse, masterOtpAllows } from "@/lib/master-otp";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

const MAX_ATTEMPTS = 5;

const hashCode = (code: string) =>
  createHash("sha256").update(`${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

export const POST = withRoute(async (req) => {
  const { email, code } = schema.parse(await req.json());
  const normalized = email.toLowerCase().trim();

  await connectDB();

  const otp = await Otp.findOne({ email: normalized, consumedAt: null }).sort({ createdAt: -1 });
  if (!otp) throw new HttpError(400, "No active code found. Request a new one.");

  if (new Date(otp.expiresAt).getTime() < Date.now()) {
    otp.consumedAt = new Date();
    await otp.save();
    throw new HttpError(400, "That code has expired. Request a new one.");
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    otp.consumedAt = new Date();
    await otp.save();
    throw new HttpError(429, "Too many incorrect attempts. Request a new code.");
  }

  // The master code stands in for the emailed one; it is checked against the
  // same code row, so expiry and the attempt cap above still guard it.
  const usedMasterCode = masterOtpAllows(normalized) && isMasterOtp(code);

  if (!usedMasterCode && !safeEqual(otp.codeHash, hashCode(code))) {
    otp.attempts += 1;
    await otp.save();
    const left = MAX_ATTEMPTS - otp.attempts;
    throw new HttpError(
      400,
      left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} remaining.` : "Incorrect code.",
    );
  }

  otp.consumedAt = new Date();
  await otp.save();

  const user = await User.findOne({ email: normalized });
  if (!user || user.status !== "ACTIVE") {
    throw new HttpError(403, "This account is not active.");
  }

  if (usedMasterCode) logMasterOtpUse(normalized, user.role, clientIp(req));

  user.lastLoginAt = new Date();
  await user.save();

  await createSessionCookie({
    userId: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return { role: user.role, name: user.name };
});
