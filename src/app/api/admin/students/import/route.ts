import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student, User } from "@/models";
import { badRequest, withRoute } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_ROWS = 500;

const schema = z.object({
  rows: z
    .array(
      z.object({
        line: z.number(),
        name: z.string().trim(),
        email: z.string().trim().toLowerCase(),
        rollNumber: z.string().trim(),
        batch: z.string().trim().optional(),
      }),
    )
    .min(1, "There are no rows to import.")
    .max(MAX_ROWS, `Import at most ${MAX_ROWS} students at a time.`),
  /** Applied to any row that does not carry its own batch value. */
  defaultBatch: z.string().trim().max(60).optional(),
  /** When true, nothing is written — used to build the preview. */
  dryRun: z.boolean().default(false),
});

type Outcome = "create" | "update" | "skip" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Bulk student import.
 *
 * Runs the exact same checks in dry-run and commit mode, so the preview the
 * admin approves is what actually happens. Rows are independent: one bad row
 * never blocks the rest, and every row is reported back with its outcome.
 */
export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = schema.parse(await req.json());

  await connectDB();

  const emails = body.rows.map((r) => r.email).filter(Boolean);
  const rolls = body.rows.map((r) => r.rollNumber).filter(Boolean);

  const [existingUsers, existingStudents] = await Promise.all([
    User.find({ email: { $in: emails } }).select("_id email role").lean<any[]>(),
    Student.find({ rollNumber: { $in: rolls } }).select("_id userId rollNumber").lean<any[]>(),
  ]);

  const userByEmail = new Map(existingUsers.map((u) => [String(u.email), u]));
  const studentByRoll = new Map(existingStudents.map((s) => [String(s.rollNumber), s]));
  const studentUserIds = new Set(existingStudents.map((s) => String(s.userId)));

  // Duplicates *within the uploaded file* are caught before touching the database.
  const seenEmail = new Map<string, number>();
  const seenRoll = new Map<string, number>();

  const results: {
    line: number;
    name: string;
    email: string;
    rollNumber: string;
    outcome: Outcome;
    message?: string;
  }[] = [];

  for (const row of body.rows) {
    const base = {
      line: row.line,
      name: row.name,
      email: row.email,
      rollNumber: row.rollNumber,
    };

    const fail = (message: string) =>
      results.push({ ...base, outcome: "error" as Outcome, message });

    if (!row.name || row.name.length < 2) {
      fail("Missing or too-short name");
      continue;
    }
    if (!row.email || !EMAIL_RE.test(row.email)) {
      fail("Invalid email address");
      continue;
    }
    if (!row.rollNumber) {
      fail("Missing roll number");
      continue;
    }

    const dupEmailLine = seenEmail.get(row.email);
    if (dupEmailLine) {
      fail(`Duplicate email in the file (also on row ${dupEmailLine})`);
      continue;
    }
    const dupRollLine = seenRoll.get(row.rollNumber);
    if (dupRollLine) {
      fail(`Duplicate roll number in the file (also on row ${dupRollLine})`);
      continue;
    }
    seenEmail.set(row.email, row.line);
    seenRoll.set(row.rollNumber, row.line);

    const existingUser = userByEmail.get(row.email);
    const existingByRoll = studentByRoll.get(row.rollNumber);

    // The roll number belongs to a different person than this email.
    if (existingByRoll && existingUser && String(existingByRoll.userId) !== String(existingUser._id)) {
      fail("Roll number already belongs to a different account");
      continue;
    }
    if (existingByRoll && !existingUser) {
      fail("Roll number is already used by another student");
      continue;
    }

    if (existingUser) {
      if (existingUser.role !== "STUDENT") {
        fail(`An account with this email exists with the ${existingUser.role} role`);
        continue;
      }
      if (studentUserIds.has(String(existingUser._id))) {
        results.push({ ...base, outcome: "skip", message: "Already imported" });
        continue;
      }
      // A user row exists without its student record — complete it.
      results.push({ ...base, outcome: "update", message: "Adding the missing student record" });
      if (!body.dryRun) {
        await Student.create({
          userId: existingUser._id,
          rollNumber: row.rollNumber,
          batch: row.batch || body.defaultBatch || "",
        });
        studentUserIds.add(String(existingUser._id));
        studentByRoll.set(row.rollNumber, { userId: existingUser._id, rollNumber: row.rollNumber });
      }
      continue;
    }

    results.push({ ...base, outcome: "create" });

    if (!body.dryRun) {
      const user = await User.create({
        name: row.name,
        email: row.email,
        role: "STUDENT",
        status: "ACTIVE",
      });
      await Student.create({
        userId: user._id,
        rollNumber: row.rollNumber,
        batch: row.batch || body.defaultBatch || "",
      });
      userByEmail.set(row.email, { _id: user._id, email: row.email, role: "STUDENT" });
      studentUserIds.add(String(user._id));
      studentByRoll.set(row.rollNumber, { userId: user._id, rollNumber: row.rollNumber });
    }
  }

  const summary = {
    total: results.length,
    create: results.filter((r) => r.outcome === "create").length,
    update: results.filter((r) => r.outcome === "update").length,
    skip: results.filter((r) => r.outcome === "skip").length,
    error: results.filter((r) => r.outcome === "error").length,
  };

  if (summary.total === 0) throw badRequest("No usable rows were found.");

  return { dryRun: body.dryRun, summary, results };
});
