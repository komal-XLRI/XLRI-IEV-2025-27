/**
 * Bootstraps the database with the six programme activities, their supporting
 * records and an admin account.
 *
 * Safe to re-run: everything is upserted by a natural key, so existing dates,
 * Drive links and student data are preserved.
 *
 *   npm run seed
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose, { Schema } from "mongoose";

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "admin@xlri.ac.in").toLowerCase();
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "IEV Administrator";

const loose = () => new Schema<any>({}, { strict: false, timestamps: true });

/**
 * The loose schemas above do not know about sub-schemas, so Mongoose will not
 * mint `_id` for nested documents. Every round and report is addressed by its
 * `_id` at runtime (`rounds.id(...)`, `reports.id(...)`), so we generate them
 * here explicitly.
 */
const oid = () => new mongoose.Types.ObjectId();

const User = mongoose.model("User", loose(), "users");
const VentureActivity = mongoose.model("VentureActivity", loose(), "ventureactivities");
const Workshop = mongoose.model("Workshop", loose(), "workshops");
const Mentoring = mongoose.model("Mentoring", loose(), "mentorings");
const SummerInternship = mongoose.model("SummerInternship", loose(), "summerinternships");
const Capstone = mongoose.model("Capstone", loose(), "capstones");
const DemoDay = mongoose.model("DemoDay", loose(), "demodays");
const StartupConclave = mongoose.model("StartupConclave", loose(), "startupconclaves");

/**
 * Note the deliberate absence of dates: the design forbids hard-coded windows.
 * Admin sets every date from the portal.
 */
const ACTIVITIES = [
  {
    type: "WORKSHOP",
    name: "Entrepreneurship Workshop",
    description: "Sessions, speakers and attendance across the workshop track.",
    status: "ONGOING",
  },
  {
    type: "MENTORING",
    name: "Venture Mentoring",
    description: "Faculty and mentor guidance sessions with rating and feedback.",
    status: "ONGOING",
  },
  {
    type: "SUMMER_INTERNSHIP",
    name: "Summer Internship",
    description: "Three internship reports submitted over the summer term.",
    status: "COMPLETED",
  },
  {
    type: "CAPSTONE",
    name: "Capstone Challenge",
    description: "The capstone challenge, its two reports and the tracking sheet.",
    status: "COMPLETED",
  },
  {
    type: "DEMO_DAY",
    name: "Demo Day",
    description: "Three mock rounds leading to the final Demo Day pitch.",
    status: "UPCOMING",
  },
  {
    type: "STARTUP_CONCLAVE",
    name: "Startup Conclave",
    description: "The one-day startup conclave and its documentation.",
    status: "COMPLETED",
  },
] as const;

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB\n");

  // ── Admin account ────────────────────────────────────────────────────────
  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { $setOnInsert: { name: ADMIN_NAME, email: ADMIN_EMAIL, role: "ADMIN", status: "ACTIVE" } },
    { upsert: true, new: true },
  );
  console.log(`  Admin account   ${admin.email}`);

  // ── The six activities ───────────────────────────────────────────────────
  const activityByType: Record<string, any> = {};

  for (const spec of ACTIVITIES) {
    const activity = await VentureActivity.findOneAndUpdate(
      { type: spec.type, ventureId: null },
      {
        $setOnInsert: {
          type: spec.type,
          ventureId: null,
          name: spec.name,
          description: spec.description,
          status: spec.status,
          date: null,
          startTime: null,
          endTime: null,
        },
      },
      { upsert: true, new: true },
    );
    activityByType[spec.type] = activity;
    console.log(`  Activity        ${spec.name}`);
  }

  // ── Supporting records ───────────────────────────────────────────────────
  await Workshop.findOneAndUpdate(
    { activityId: activityByType.WORKSHOP._id },
    {
      $setOnInsert: {
        activityId: activityByType.WORKSHOP._id,
        title: "Entrepreneurship Workshop",
        description: "Workshop sessions run for the IEV batch.",
        sessions: [],
        reports: [],
      },
    },
    { upsert: true, new: true },
  );
  console.log("  Workshop        record ready");

  await Mentoring.findOneAndUpdate(
    { activityId: activityByType.MENTORING._id },
    {
      $setOnInsert: {
        activityId: activityByType.MENTORING._id,
        assignments: [],
        sessions: [],
      },
    },
    { upsert: true, new: true },
  );
  console.log("  Mentoring       record ready");

  await SummerInternship.findOneAndUpdate(
    { activityId: activityByType.SUMMER_INTERNSHIP._id },
    {
      $setOnInsert: {
        activityId: activityByType.SUMMER_INTERNSHIP._id,
        title: "Summer Internship",
        status: "COMPLETED",
        reports: [
          { _id: oid(), name: "Report 1", driveFolderId: null, driveUrl: null },
          { _id: oid(), name: "Report 2", driveFolderId: null, driveUrl: null },
          { _id: oid(), name: "Report 3", driveFolderId: null, driveUrl: null },
        ],
      },
    },
    { upsert: true, new: true },
  );
  console.log("  Internship      record ready (3 report folders)");

  await Capstone.findOneAndUpdate(
    { activityId: activityByType.CAPSTONE._id },
    {
      $setOnInsert: {
        activityId: activityByType.CAPSTONE._id,
        status: "COMPLETED",
        challenge: { title: "", description: "", instructions: "" },
        reports: [
          { _id: oid(), name: "Report 1", driveFolderId: null, driveUrl: null },
          { _id: oid(), name: "Report 2", driveFolderId: null, driveUrl: null },
        ],
        excelFile: { driveFileId: null, fileName: null, driveUrl: null },
      },
    },
    { upsert: true, new: true },
  );
  console.log("  Capstone        record ready (2 reports + excel)");

  await DemoDay.findOneAndUpdate(
    { activityId: activityByType.DEMO_DAY._id },
    {
      $setOnInsert: {
        activityId: activityByType.DEMO_DAY._id,
        // Dates stay null — admin sets them from the portal.
        rounds: ["MOCK_1", "MOCK_2", "MOCK_3", "FINAL"].map((type) => ({
          _id: oid(),
          type,
          date: null,
          startTime: null,
          endTime: null,
          submissionsOpen: false,
          driveFolderId: null,
          driveUrl: null,
          submissions: [],
        })),
      },
    },
    { upsert: true, new: true },
  );
  console.log("  Demo Day        record ready (3 mocks + final)");

  await StartupConclave.findOneAndUpdate(
    { activityId: activityByType.STARTUP_CONCLAVE._id },
    {
      $setOnInsert: {
        activityId: activityByType.STARTUP_CONCLAVE._id,
        title: "Startup Conclave",
        description: "One-day startup conclave.",
        status: "COMPLETED",
        date: null,
      },
    },
    { upsert: true, new: true },
  );
  console.log("  Conclave        record ready");

  console.log(`
Seed complete.

Next steps:
  1. npm run dev
  2. Sign in at http://localhost:3000/login as ${ADMIN_EMAIL}
     (without SMTP configured, the code is printed to this terminal)
  3. Add students, faculty and mentors under Users & Roles
  4. Set activity dates under Activities
  5. Link Drive folders under Drive Folders, then map files to students
`);

  await mongoose.disconnect();
}

/** Minimal .env.local reader so the script needs no extra dependency. */
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (!match) continue;
        const key = match[1];
        if (process.env[key]) continue;
        let value = (match[2] ?? "").trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    } catch {
      /* file absent — fine */
    }
  }
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
