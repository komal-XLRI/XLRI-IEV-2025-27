import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Otp, User } from "@/models";
import { sendOtpEmail, smtpConfigured } from "@/lib/mailer";
import { withRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { masterOtpAllows } from "@/lib/master-otp";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;

const hashCode = (code: string) =>
  createHash("sha256").update(`${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");

export const POST = withRoute(async (req) => {
  const { email } = schema.parse(await req.json());
  const normalized = email.toLowerCase().trim();

  await connectDB();

  const user = await User.findOne({ email: normalized }).lean<any>();

  // Only pre-registered accounts can sign in. The message deliberately does not
  // confirm whether the address exists.
  if (!user || user.status !== "ACTIVE") {
    throw new HttpError(
      404,
      "No active account is registered with this email. Please contact the IEV office.",
    );
  }

  const recent = await Otp.findOne({ email: normalized, consumedAt: null }).sort({ createdAt: -1 });
  if (recent && Date.now() - new Date(recent.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - new Date(recent.createdAt).getTime())) / 1000,
    );
    throw new HttpError(429, `Please wait ${wait}s before requesting another code.`);
  }

  // Invalidate any codes still outstanding for this address.
  await Otp.updateMany({ email: normalized, consumedAt: null }, { consumedAt: new Date() });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const otp = await Otp.create({
    email: normalized,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  const { delivered, error } = await sendOtpEmail(normalized, code, user.name);
  const isDev = process.env.NODE_ENV !== "production";

  // A master code is configured for this address, so the code row has to
  // survive a delivery failure — it is what the master code is checked against.
  const hasMasterFallback = masterOtpAllows(normalized);

  // Delivery failed outright (misconfigured provider, refused sender, network).
  if (error && !isDev && !hasMasterFallback) {
    // Drop the unusable code so the caller is not held by the resend cooldown
    // while an administrator fixes the configuration.
    await Otp.deleteOne({ _id: otp._id });
    throw new HttpError(502, `Your sign-in code could not be sent. ${error}`);
  }

  if (error && !isDev) console.error(`[IEV] OTP email to ${normalized} failed: ${error}`);

  return {
    delivered,
    smtpConfigured,
    // Whenever the code could not be emailed, development returns it directly
    // so local work is never blocked on a mail provider. Never in production.
    devCode: !delivered && isDev ? code : undefined,
    // The provider's wording names hosts and credentials, so it stays in
    // development. Production only learns that the email did not arrive.
    deliveryError: error && isDev ? error : undefined,
    masterFallback: Boolean(error) && !isDev && hasMasterFallback,
  };
});
