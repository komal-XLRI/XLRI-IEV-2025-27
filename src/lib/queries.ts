import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import {
  ActivityResource,
  Capstone,
  DemoDay,
  Mentoring,
  StartupConclave,
  Student,
  StudentVenture,
  SummerInternship,
  User,
  VentureActivity,
  Workshop,
} from "@/models";
import { serialize } from "@/lib/api";
import type { ActivityType } from "@/lib/constants";

/* ───────────────────────────── activities ───────────────────────────── */

/**
 * The programme-wide record for an activity type. All six are singletons at the
 * batch level, created by the seed and edited by admin.
 */
export async function getActivity(type: ActivityType) {
  await connectDB();
  const activity = await VentureActivity.findOne({ type, ventureId: null }).lean<any>();
  return activity ? serialize(activity) : null;
}

export async function listActivities() {
  await connectDB();
  const activities = await VentureActivity.find({ ventureId: null }).sort({ type: 1 }).lean<any[]>();
  return serialize(activities);
}

/* ─────────────────────────────── student ────────────────────────────── */

export async function getStudentProfile(userId: string) {
  await connectDB();
  const student = await Student.findOne({ userId }).lean<any>();
  if (!student) return null;
  const user = await User.findById(userId).lean<any>();
  return serialize({ ...student, user });
}

export async function getStudentVenture(studentId: string) {
  await connectDB();
  const venture = await StudentVenture.findOne({ studentId })
    .populate("facultyId", "name email role")
    .populate("mentorId", "name email role")
    .lean<any>();
  return venture ? serialize(venture) : null;
}

/**
 * Every Drive file this student owns for an activity. This is the single
 * chokepoint that keeps one student's reports out of another student's view.
 */
export async function getStudentResources(studentId: string, activityId?: string) {
  await connectDB();
  const query: Record<string, unknown> = { studentId };
  if (activityId) query.activityId = activityId;
  const resources = await ActivityResource.find(query).sort({ category: 1, fileName: 1 }).lean<any[]>();
  return serialize(resources);
}

/* ───────────────────────────── activity detail ──────────────────────── */

export async function getWorkshop() {
  await connectDB();
  const activity = await VentureActivity.findOne({ type: "WORKSHOP", ventureId: null }).lean<any>();
  if (!activity) return null;
  const workshop = await Workshop.findOne({ activityId: activity._id }).lean<any>();
  return serialize({ activity, workshop });
}

export async function getMentoring() {
  await connectDB();
  const activity = await VentureActivity.findOne({ type: "MENTORING", ventureId: null }).lean<any>();
  if (!activity) return null;
  const mentoring = await Mentoring.findOne({ activityId: activity._id }).lean<any>();
  return serialize({ activity, mentoring });
}

export async function getSummerInternship() {
  await connectDB();
  const activity = await VentureActivity.findOne({
    type: "SUMMER_INTERNSHIP",
    ventureId: null,
  }).lean<any>();
  if (!activity) return null;
  const internship = await SummerInternship.findOne({ activityId: activity._id }).lean<any>();
  return serialize({ activity, internship });
}

export async function getCapstone() {
  await connectDB();
  const activity = await VentureActivity.findOne({ type: "CAPSTONE", ventureId: null }).lean<any>();
  if (!activity) return null;
  const capstone = await Capstone.findOne({ activityId: activity._id }).lean<any>();
  return serialize({ activity, capstone });
}

export async function getDemoDay() {
  await connectDB();
  const activity = await VentureActivity.findOne({ type: "DEMO_DAY", ventureId: null }).lean<any>();
  if (!activity) return null;
  const demoDay = await DemoDay.findOne({ activityId: activity._id }).lean<any>();
  return serialize({ activity, demoDay });
}

export async function getStartupConclave() {
  await connectDB();
  const activity = await VentureActivity.findOne({
    type: "STARTUP_CONCLAVE",
    ventureId: null,
  }).lean<any>();
  if (!activity) return null;
  const conclave = await StartupConclave.findOne({ activityId: activity._id }).lean<any>();
  return serialize({ activity, conclave });
}

/* ──────────────────────────── student dossier ───────────────────────── */

/**
 * Everything the portal holds about one student, for the admin detail page:
 * account, profile, venture, and their slice of all six activities.
 *
 * Each activity document holds the whole batch, so every list here is filtered
 * down to this student before it leaves the server — an admin view still has no
 * reason to ship the rest of the cohort's records to the browser.
 */
export async function getStudentDossier(studentId: string) {
  // A malformed id is a wrong URL, not a server fault: findById would throw a
  // CastError, and a page has no error mapping to turn that into a 404.
  if (!Types.ObjectId.isValid(studentId)) return null;

  await connectDB();

  const student = await Student.findById(studentId)
    .populate("userId", "name email status role lastLoginAt createdAt")
    .lean<any>();
  if (!student) return null;

  const sid = String(student._id);
  const mine = (id: unknown) => String(id) === sid;

  const [activities, venture, workshopDoc, mentoringDoc, demoDayDoc, resources] = await Promise.all([
    VentureActivity.find({ ventureId: null }).lean<any[]>(),
    StudentVenture.findOne({ studentId })
      .populate("facultyId", "name email")
      .populate("mentorId", "name email")
      .lean<any>(),
    Workshop.findOne().lean<any>(),
    Mentoring.findOne()
      .populate("assignments.facultyId", "name email")
      .populate("assignments.mentorId", "name email")
      .populate("sessions.facultyReview.facultyId", "name email")
      .populate("sessions.mentorReview.mentorId", "name email")
      .lean<any>(),
    DemoDay.findOne().lean<any>(),
    ActivityResource.find({ studentId }).sort({ category: 1, fileName: 1 }).lean<any[]>(),
  ]);

  // Workshop: every session, annotated with this student's attendance. Sessions
  // where they were never marked show as "not recorded" rather than absent.
  const workshopSessions = (workshopDoc?.sessions ?? []).map((s: any) => {
    const entry = (s.participants ?? []).find((p: any) => mine(p.studentId));
    return {
      _id: s._id,
      title: s.title,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      speaker: s.speaker,
      venue: s.venue,
      attendance: entry?.attendance ?? null,
      note: entry?.note ?? null,
    };
  });

  const assignment = (mentoringDoc?.assignments ?? []).find((a: any) => mine(a.studentId)) ?? null;
  const mentoringSessions = (mentoringDoc?.sessions ?? []).filter((s: any) => mine(s.studentId));

  const demoRounds = (demoDayDoc?.rounds ?? []).map((r: any) => ({
    _id: r._id,
    type: r.type,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    submissionsOpen: r.submissionsOpen,
    submission: (r.submissions ?? []).find((s: any) => mine(s.studentId)) ?? null,
  }));

  return serialize({
    student,
    venture,
    activities,
    workshop: {
      title: workshopDoc?.title ?? null,
      sessions: workshopSessions,
      attended: workshopSessions.filter((s: any) => s.attendance === "PRESENT").length,
    },
    mentoring: {
      faculty: assignment?.facultyId ?? null,
      mentor: assignment?.mentorId ?? null,
      sessions: mentoringSessions,
    },
    demoRounds,
    resources,
  });
}

/* ─────────────────────────────── directory ──────────────────────────── */

export async function listStudentsWithUsers() {
  await connectDB();
  const students = await Student.find().populate("userId", "name email status role").lean<any[]>();
  return serialize(
    students.sort((a, b) => (a.userId?.name ?? "").localeCompare(b.userId?.name ?? "")),
  );
}

export async function listUsersByRole(role: string) {
  await connectDB();
  const users = await User.find({ role }).sort({ name: 1 }).lean<any[]>();
  return serialize(users);
}

export async function listVentures() {
  await connectDB();
  const ventures = await StudentVenture.find()
    .populate({ path: "studentId", populate: { path: "userId", select: "name email" } })
    .populate("facultyId", "name email")
    .populate("mentorId", "name email")
    .sort({ ventureName: 1 })
    .lean<any[]>();
  return serialize(ventures);
}

/* ──────────────────────────── reviewer views ────────────────────────── */

/**
 * Sessions a faculty member or mentor is responsible for, based on the
 * mentoring assignment table. Reviewers never see unassigned students.
 */
export type ReviewerWorkload = {
  activityId: string | null;
  mentoringId: string | null;
  assignedStudentIds: string[];
  students: any[];
  sessions: any[];
};

export async function getReviewerWorkload(
  userId: string,
  role: "FACULTY" | "MENTOR",
): Promise<ReviewerWorkload> {
  const empty: ReviewerWorkload = {
    activityId: null,
    mentoringId: null,
    assignedStudentIds: [],
    students: [],
    sessions: [],
  };

  await connectDB();
  const activity = await VentureActivity.findOne({ type: "MENTORING", ventureId: null }).lean<any>();
  if (!activity) return empty;

  const mentoring = await Mentoring.findOne({ activityId: activity._id }).lean<any>();
  if (!mentoring) return { ...empty, activityId: String(activity._id) };

  const key = role === "FACULTY" ? "facultyId" : "mentorId";
  const assignedStudentIds = (mentoring.assignments ?? [])
    .filter((a: any) => String(a[key] ?? "") === String(userId))
    .map((a: any) => String(a.studentId));

  const students = await Student.find({ _id: { $in: assignedStudentIds } })
    .populate("userId", "name email")
    .lean<any[]>();

  const ventures = await StudentVenture.find({ studentId: { $in: assignedStudentIds } }).lean<any[]>();
  const ventureByStudent = new Map(ventures.map((v) => [String(v.studentId), v]));

  const sessions = (mentoring.sessions ?? [])
    .filter((s: any) => assignedStudentIds.includes(String(s.studentId)))
    .sort((a: any, b: any) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  return serialize({
    activityId: String(activity._id),
    mentoringId: String(mentoring._id),
    assignedStudentIds,
    students: students.map((s) => ({ ...s, venture: ventureByStudent.get(String(s._id)) ?? null })),
    sessions,
  });
}

/* ────────────────────────────── dashboards ──────────────────────────── */

export async function getAdminStats() {
  await connectDB();
  const [studentCount, ventureCount, facultyCount, mentorCount, resourceCount, activities] =
    await Promise.all([
      Student.countDocuments(),
      StudentVenture.countDocuments(),
      User.countDocuments({ role: "FACULTY" }),
      User.countDocuments({ role: "MENTOR" }),
      ActivityResource.countDocuments(),
      VentureActivity.find({ ventureId: null }).sort({ date: 1 }).lean<any[]>(),
    ]);

  const demoActivity = activities.find((a) => a.type === "DEMO_DAY");
  const demoDay = demoActivity
    ? await DemoDay.findOne({ activityId: demoActivity._id }).lean<any>()
    : null;
  const submissionCount = (demoDay?.rounds ?? []).reduce(
    (sum: number, r: any) => sum + (r.submissions?.length ?? 0),
    0,
  );

  const mentoringActivity = activities.find((a) => a.type === "MENTORING");
  const mentoring = mentoringActivity
    ? await Mentoring.findOne({ activityId: mentoringActivity._id }).lean<any>()
    : null;
  const sessions = mentoring?.sessions ?? [];
  const pendingReviews = sessions.filter(
    (s: any) => !s.facultyReview?.reviewedAt || !s.mentorReview?.reviewedAt,
  ).length;

  return serialize({
    studentCount,
    ventureCount,
    facultyCount,
    mentorCount,
    resourceCount,
    submissionCount,
    mentoringSessionCount: sessions.length,
    pendingReviews,
    activities,
  });
}
