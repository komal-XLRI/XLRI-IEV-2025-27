import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Student, StudentVenture, User } from "@/models";
import { withRoute } from "@/lib/api";
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
        ventureName: z.string().trim(),
        industry: z.string().trim().optional(),
        currentStage: z.string().trim().optional(),
        bottlenecks: z.string().trim().optional(),
        resources: z.string().trim().optional(),
        guidance: z.string().trim().optional(),
      }),
    )
    .min(1, "There are no rows to import.")
    .max(MAX_ROWS, `Import at most ${MAX_ROWS} ventures at a time.`),
  /** Overwrite a venture the student already has, rather than skipping it. */
  overwrite: z.boolean().default(false),
  /** When true, nothing is written — used to build the preview. */
  dryRun: z.boolean().default(false),
});

type Outcome = "create" | "update" | "skip" | "error";

/**
 * Bulk venture import from the intake sheet.
 *
 * A venture belongs to a student who must already exist — this never creates
 * accounts, so a typo'd roll number is reported rather than silently making a
 * second student. Dry-run and commit share every check, so the preview the
 * admin approves is exactly what happens.
 */
export const POST = withRoute(async (req) => {
  await requireApiSession(["ADMIN"]);
  const body = schema.parse(await req.json());

  await connectDB();

  const rolls = body.rows.map((r) => r.rollNumber).filter(Boolean);
  const emails = body.rows.map((r) => r.email).filter(Boolean);

  const [byRoll, usersByEmail] = await Promise.all([
    Student.find({ rollNumber: { $in: rolls } })
      .populate("userId", "name email")
      .lean<any[]>(),
    User.find({ email: { $in: emails }, role: "STUDENT" }).select("_id email").lean<any[]>(),
  ]);

  const studentByRoll = new Map(byRoll.map((s) => [String(s.rollNumber), s]));
  const userIdByEmail = new Map(usersByEmail.map((u) => [String(u.email), String(u._id)]));

  // Students matched by email need a second lookup by their user id.
  const emailUserIds = [...userIdByEmail.values()];
  const byUserId = emailUserIds.length
    ? await Student.find({ userId: { $in: emailUserIds } })
        .populate("userId", "name email")
        .lean<any[]>()
    : [];
  const studentByUserId = new Map(byUserId.map((s) => [String(s.userId?._id ?? s.userId), s]));

  const studentIds = [...new Set([...byRoll, ...byUserId].map((s) => String(s._id)))];
  const existingVentures = studentIds.length
    ? await StudentVenture.find({ studentId: { $in: studentIds } })
        .select("_id studentId ventureName")
        .lean<any[]>()
    : [];
  const ventureByStudent = new Map(existingVentures.map((v) => [String(v.studentId), v]));

  // Duplicates *within the uploaded file* are caught before touching the database.
  const seenStudent = new Map<string, number>();

  const results: {
    line: number;
    student: string;
    ventureName: string;
    outcome: Outcome;
    message: string;
  }[] = [];

  const writes: { studentId: string; row: (typeof body.rows)[number]; update: boolean }[] = [];

  for (const row of body.rows) {
    const label = row.name || row.rollNumber || row.email || "—";
    const push = (outcome: Outcome, message: string) =>
      results.push({ line: row.line, student: label, ventureName: row.ventureName, outcome, message });

    if (!row.ventureName) {
      push("error", "Missing startup/business name");
      continue;
    }
    if (!row.rollNumber && !row.email) {
      push("error", "Missing roll number and email — cannot tell whose venture this is");
      continue;
    }

    const student =
      (row.rollNumber ? studentByRoll.get(row.rollNumber) : undefined) ??
      (row.email ? studentByUserId.get(userIdByEmail.get(row.email) ?? "") : undefined);

    if (!student) {
      push(
        "error",
        `No student found for ${row.rollNumber || row.email}. Import the student roster first.`,
      );
      continue;
    }

    const studentId = String(student._id);

    const duplicateLine = seenStudent.get(studentId);
    if (duplicateLine !== undefined) {
      push("error", `Same student appears again (first on line ${duplicateLine})`);
      continue;
    }
    seenStudent.set(studentId, row.line);

    const existing = ventureByStudent.get(studentId);
    if (existing && !body.overwrite) {
      push("skip", `Already has a venture (${existing.ventureName})`);
      continue;
    }

    writes.push({ studentId, row, update: Boolean(existing) });
    push(
      existing ? "update" : "create",
      existing ? `Replaces "${existing.ventureName}"` : "New venture",
    );
  }

  const summary = {
    total: body.rows.length,
    create: results.filter((r) => r.outcome === "create").length,
    update: results.filter((r) => r.outcome === "update").length,
    skip: results.filter((r) => r.outcome === "skip").length,
    error: results.filter((r) => r.outcome === "error").length,
  };

  if (body.dryRun || writes.length === 0) {
    return { dryRun: body.dryRun, summary, results };
  }

  const ops = writes.map(({ studentId, row }) => ({
    updateOne: {
      filter: { studentId },
      update: {
        $set: {
          studentId,
          ventureName: row.ventureName,
          industry: row.industry ?? "",
          currentStage: row.currentStage ?? "",
          bottlenecks: row.bottlenecks ?? "",
          resources: row.resources ?? "",
          guidance: row.guidance ?? "",
        },
      },
      upsert: true,
    },
  }));

  await StudentVenture.bulkWrite(ops);

  return { dryRun: false, summary, results };
});
