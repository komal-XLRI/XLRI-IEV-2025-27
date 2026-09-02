import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Student, User } from "@/models";
import { getSession, type SessionPayload } from "@/lib/session";
import type { Role } from "@/lib/constants";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ───────────────────────── route-handler guards ───────────────────────── */

/**
 * For API routes. Throws HttpError, which `withRoute` turns into a JSON
 * response — never leaks data on an unauthenticated request.
 */
export async function requireApiSession(roles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "You are not signed in.");
  if (roles && !roles.includes(session.role)) {
    throw new HttpError(403, "You do not have permission to perform this action.");
  }
  return session;
}

/** Resolves the Student document for the signed-in user. Students only. */
export async function requireApiStudent() {
  const session = await requireApiSession(["STUDENT"]);
  await connectDB();
  const student = await Student.findOne({ userId: session.userId }).lean<any>();
  if (!student) {
    throw new HttpError(403, "No student profile is linked to this account.");
  }
  return { session, student };
}

/* ────────────────────────── page-level guards ─────────────────────────── */

export async function requirePageSession(roles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (roles && !roles.includes(session.role)) redirect("/dashboard");
  return session;
}

export async function getCurrentStudent(userId: string) {
  await connectDB();
  return Student.findOne({ userId }).lean<any>();
}

export async function getCurrentUser(userId: string) {
  await connectDB();
  return User.findById(userId).lean<any>();
}

/* ───────────────────────────── role helpers ───────────────────────────── */

export const isAdmin = (role: Role) => role === "ADMIN";
export const isReviewer = (role: Role) => role === "FACULTY" || role === "MENTOR";
export const isStudent = (role: Role) => role === "STUDENT";
