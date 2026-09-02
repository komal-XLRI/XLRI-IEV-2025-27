import { timingSafeEqual } from "node:crypto";

/**
 * Master sign-in code — a break-glass fallback for when email delivery is down.
 *
 * It is deliberately narrow:
 *   • disabled unless MASTER_OTP is set to a six-digit, non-trivial value;
 *   • it *replaces the emailed code*, it does not skip the OTP flow, so the
 *     10-minute expiry and the 5-attempt cap on the code row still apply;
 *   • the account must still exist and be ACTIVE;
 *   • MASTER_OTP_EMAILS, when set, limits it to named addresses;
 *   • every use is written to the server log.
 *
 * Six digits keeps it usable in the existing code boxes; the attempt cap is
 * what makes that safe, which is why the code row is never bypassed.
 */

const raw = process.env.MASTER_OTP?.trim() ?? "";
const rawAllowlist = process.env.MASTER_OTP_EMAILS?.trim() ?? "";

/** Rejects the codes an attacker would try first. */
function isTrivial(code: string) {
  if (/^(\d)\1{5}$/.test(code)) return true; // 000000, 111111, …
  return "01234567890".includes(code) || "09876543210".includes(code);
}

function load(): string | null {
  if (!raw) return null;
  if (!/^\d{6}$/.test(raw)) {
    console.warn(
      "[IEV] MASTER_OTP is set but is not exactly 6 digits, so it has been ignored. " +
        "Use a value like MASTER_OTP=418209.",
    );
    return null;
  }
  if (isTrivial(raw)) {
    console.warn(
      "[IEV] MASTER_OTP is set to an easily guessed value (repeated or sequential digits) " +
        "and has been ignored. Choose an unpredictable 6-digit code.",
    );
    return null;
  }
  return raw;
}

const masterCode = load();

/** Lower-cased addresses allowed to use the master code; empty means any account. */
export const masterOtpAllowlist = rawAllowlist
  ? rawAllowlist
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  : [];

export const masterOtpEnabled = masterCode !== null;

if (masterOtpEnabled) {
  console.warn(
    `[IEV] Master sign-in code is ENABLED${
      masterOtpAllowlist.length
        ? ` for ${masterOtpAllowlist.length} address(es): ${masterOtpAllowlist.join(", ")}`
        : " for every active account — set MASTER_OTP_EMAILS to restrict it"
    }.`,
  );
}

/** True when this address may use the master code at all. */
export function masterOtpAllows(email: string) {
  if (!masterOtpEnabled) return false;
  if (masterOtpAllowlist.length === 0) return true;
  return masterOtpAllowlist.includes(email.toLowerCase().trim());
}

/** Constant-time comparison against the configured master code. */
export function isMasterOtp(code: string) {
  if (!masterCode) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(masterCode);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Records a break-glass sign-in. These should be rare and worth noticing. */
export function logMasterOtpUse(email: string, role: string, ip: string) {
  console.warn(
    `[IEV] MASTER CODE SIGN-IN  email=${email}  role=${role}  ip=${ip}  at=${new Date().toISOString()}`,
  );
}
