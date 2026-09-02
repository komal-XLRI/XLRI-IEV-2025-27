import mongoose, { Schema, type Model } from "mongoose";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  DEMO_ROUND_TYPES,
  RESOURCE_CATEGORIES,
  ROLES,
} from "@/lib/constants";

const { ObjectId } = Schema.Types;
const opts = { timestamps: true };

/* ─────────────────────────── 1. users ─────────────────────────── */

const userSchema = new Schema<any>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ROLES, required: true, default: "STUDENT" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    lastLoginAt: { type: Date },
  },
  opts,
);

/* ─────────────────── login OTP (short-lived codes) ─────────────── */

const otpSchema = new Schema<any>({
  email: { type: String, required: true, lowercase: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  consumedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});
// Codes are swept 10 minutes after expiry by MongoDB itself.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });

/* ────────────────────────── 2. students ───────────────────────── */

const studentSchema = new Schema<any>(
  {
    userId: { type: ObjectId, ref: "User", required: true, unique: true },
    rollNumber: { type: String, required: true, trim: true, index: true },
    batch: { type: String, trim: true },
    background: { type: String },
    strengths: { type: String },
    weakness: { type: String },
  },
  opts,
);

/* ─────────────────────── 3. student_ventures ──────────────────── */

const studentVentureSchema = new Schema<any>(
  {
    studentId: { type: ObjectId, ref: "Student", required: true, index: true },
    ventureName: { type: String, required: true, trim: true },
    industry: { type: String, trim: true },
    problemStatement: { type: String },
    solution: { type: String },
    facultyId: { type: ObjectId, ref: "User" },
    mentorId: { type: ObjectId, ref: "User" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  opts,
);

/* ────────────────────── 4. venture_activities ─────────────────── */
/**
 * Master activity record. `ventureId` is intentionally optional: the six
 * activities run programme-wide for the batch, and a per-venture record is only
 * created when an activity is scoped to a single venture.
 */
const ventureActivitySchema = new Schema<any>(
  {
    ventureId: { type: ObjectId, ref: "StudentVenture", default: null, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true, index: true },
    description: { type: String },
    date: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    status: { type: String, enum: ACTIVITY_STATUSES, default: "UPCOMING", index: true },
  },
  opts,
);

/* ───────────────────────── 5. workshops ───────────────────────── */

const workshopParticipantSchema = new Schema<any>(
  {
    studentId: { type: ObjectId, ref: "Student", required: true },
    attendance: { type: String, enum: ["PRESENT", "ABSENT", "EXCUSED"], default: "ABSENT" },
    note: { type: String },
  },
  { _id: false },
);

const workshopSessionSchema = new Schema<any>({
  title: { type: String, required: true },
  date: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  speaker: { type: String },
  venue: { type: String },
  participants: { type: [workshopParticipantSchema], default: [] },
});

const workshopReportSchema = new Schema<any>({
  title: { type: String },
  driveFolderId: { type: String },
  driveUrl: { type: String },
});

const workshopSchema = new Schema<any>(
  {
    activityId: { type: ObjectId, ref: "VentureActivity", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    sessions: { type: [workshopSessionSchema], default: [] },
    reports: { type: [workshopReportSchema], default: [] },
  },
  opts,
);

/* ───────────────────────── 6. mentorings ──────────────────────── */

const facultyReviewSchema = new Schema<any>(
  {
    facultyId: { type: ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    reviewedAt: { type: Date },
  },
  { _id: false },
);

const mentorReviewSchema = new Schema<any>(
  {
    mentorId: { type: ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    reviewedAt: { type: Date },
  },
  { _id: false },
);

const driveFileSchema = new Schema<any>({
  driveFileId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String },
  driveUrl: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const mentoringSessionSchema = new Schema<any>({
  studentId: { type: ObjectId, ref: "Student", required: true, index: true },
  date: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  topic: { type: String },
  files: { type: [driveFileSchema], default: [] },
  facultyReview: { type: facultyReviewSchema, default: () => ({}) },
  mentorReview: { type: mentorReviewSchema, default: () => ({}) },
});

const mentoringAssignmentSchema = new Schema<any>(
  {
    studentId: { type: ObjectId, ref: "Student", required: true },
    facultyId: { type: ObjectId, ref: "User" },
    mentorId: { type: ObjectId, ref: "User" },
  },
  { _id: false },
);

const mentoringSchema = new Schema<any>(
  {
    activityId: { type: ObjectId, ref: "VentureActivity", required: true, index: true },
    assignments: { type: [mentoringAssignmentSchema], default: [] },
    sessions: { type: [mentoringSessionSchema], default: [] },
  },
  opts,
);

/* ────────────────────── 7. summer_internships ─────────────────── */

const folderRefSchema = new Schema<any>({
  name: { type: String },
  driveFolderId: { type: String },
  driveUrl: { type: String },
});

const summerInternshipSchema = new Schema<any>(
  {
    activityId: { type: ObjectId, ref: "VentureActivity", required: true, index: true },
    title: { type: String, default: "Summer Internship" },
    driveFolderId: { type: String },
    driveUrl: { type: String },
    status: { type: String, enum: ACTIVITY_STATUSES, default: "COMPLETED" },
    reports: { type: [folderRefSchema], default: [] },
  },
  opts,
);

/* ───────────────────────── 8. capstones ───────────────────────── */

const capstoneSchema = new Schema<any>(
  {
    activityId: { type: ObjectId, ref: "VentureActivity", required: true, index: true },
    challenge: {
      title: { type: String },
      description: { type: String },
      instructions: { type: String },
    },
    driveFolderId: { type: String },
    driveUrl: { type: String },
    reports: { type: [folderRefSchema], default: [] },
    excelFile: {
      driveFileId: { type: String },
      fileName: { type: String },
      driveUrl: { type: String },
    },
    status: { type: String, enum: ACTIVITY_STATUSES, default: "COMPLETED" },
  },
  opts,
);

/* ───────────────────────── 9. demo_days ───────────────────────── */

const demoSubmissionSchema = new Schema<any>({
  studentId: { type: ObjectId, ref: "Student", required: true, index: true },
  driveFileId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String },
  driveUrl: { type: String },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["SUBMITTED", "REVIEWED", "REJECTED"], default: "SUBMITTED" },
});

const demoRoundSchema = new Schema<any>({
  type: { type: String, enum: DEMO_ROUND_TYPES, required: true },
  date: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  submissionsOpen: { type: Boolean, default: false },
  driveFolderId: { type: String },
  driveUrl: { type: String },
  submissions: { type: [demoSubmissionSchema], default: [] },
});

const demoDaySchema = new Schema<any>(
  {
    activityId: { type: ObjectId, ref: "VentureActivity", required: true, index: true },
    rounds: { type: [demoRoundSchema], default: [] },
  },
  opts,
);

/* ────────────────────── 10. startup_conclaves ─────────────────── */

const startupConclaveSchema = new Schema<any>(
  {
    activityId: { type: ObjectId, ref: "VentureActivity", required: true, index: true },
    title: { type: String, default: "Startup Conclave" },
    description: { type: String },
    date: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    driveFolderId: { type: String },
    driveUrl: { type: String },
    status: { type: String, enum: ACTIVITY_STATUSES, default: "COMPLETED" },
  },
  opts,
);

/* ────────────────────── 11. activity_resources ────────────────── */
/**
 * The ownership table: maps one Drive file to exactly one student, so the
 * backend can answer "which files may this student see?" without ever handing
 * out a folder URL containing other students' work.
 */
const activityResourceSchema = new Schema<any>(
  {
    activityId: { type: ObjectId, ref: "VentureActivity", required: true, index: true },
    studentId: { type: ObjectId, ref: "Student", required: true, index: true },
    category: { type: String, enum: RESOURCE_CATEGORIES, default: "OTHER" },
    driveFileId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String },
    driveUrl: { type: String },
    access: { type: String, enum: ["VIEW"], default: "VIEW" },
    mappedBy: { type: ObjectId, ref: "User" },
  },
  opts,
);
activityResourceSchema.index({ activityId: 1, driveFileId: 1 }, { unique: true });
activityResourceSchema.index({ studentId: 1, activityId: 1 });

/* ───────────────────────── model registry ─────────────────────── */

type AnyModel = Model<any>;

/**
 * Reuse an already-registered model on hot reload. The `Model<any>` cast is
 * deliberate: letting Mongoose infer document types from these schemas sends
 * the TypeScript checker into a runaway instantiation loop.
 */
function reg(name: string, schema: Schema<any>): AnyModel {
  return (mongoose.models[name] as AnyModel) ?? (mongoose.model(name, schema) as AnyModel);
}

export const User = reg("User", userSchema);
export const Otp = reg("Otp", otpSchema);
export const Student = reg("Student", studentSchema);
export const StudentVenture = reg("StudentVenture", studentVentureSchema);
export const VentureActivity = reg("VentureActivity", ventureActivitySchema);
export const Workshop = reg("Workshop", workshopSchema);
export const Mentoring = reg("Mentoring", mentoringSchema);
export const SummerInternship = reg("SummerInternship", summerInternshipSchema);
export const Capstone = reg("Capstone", capstoneSchema);
export const DemoDay = reg("DemoDay", demoDaySchema);
export const StartupConclave = reg("StartupConclave", startupConclaveSchema);
export const ActivityResource = reg("ActivityResource", activityResourceSchema);

export { mongoose };
