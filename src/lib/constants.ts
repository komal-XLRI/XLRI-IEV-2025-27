export const ROLES = ["ADMIN", "STUDENT", "FACULTY", "MENTOR"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIVITY_TYPES = [
  "WORKSHOP",
  "MENTORING",
  "SUMMER_INTERNSHIP",
  "CAPSTONE",
  "DEMO_DAY",
  "STARTUP_CONCLAVE",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = ["UPCOMING", "ONGOING", "COMPLETED"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const DEMO_ROUND_TYPES = ["MOCK_1", "MOCK_2", "MOCK_3", "FINAL"] as const;
export type DemoRoundType = (typeof DEMO_ROUND_TYPES)[number];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  WORKSHOP: "Workshop",
  MENTORING: "Mentoring",
  SUMMER_INTERNSHIP: "Summer Internship",
  CAPSTONE: "Capstone",
  DEMO_DAY: "Demo Day",
  STARTUP_CONCLAVE: "Startup Conclave",
};

export const DEMO_ROUND_LABELS: Record<DemoRoundType, string> = {
  MOCK_1: "Mock 1",
  MOCK_2: "Mock 2",
  MOCK_3: "Mock 3",
  FINAL: "Final Demo Day",
};

export const RESOURCE_CATEGORIES = [
  "REPORT_1",
  "REPORT_2",
  "REPORT_3",
  "CAPSTONE_REPORT_1",
  "CAPSTONE_REPORT_2",
  "CAPSTONE_EXCEL",
  "STARTUP_CONCLAVE",
  "OTHER",
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  REPORT_1: "Internship Report 1",
  REPORT_2: "Internship Report 2",
  REPORT_3: "Internship Report 3",
  CAPSTONE_REPORT_1: "Capstone Report 1",
  CAPSTONE_REPORT_2: "Capstone Report 2",
  CAPSTONE_EXCEL: "Capstone Excel",
  STARTUP_CONCLAVE: "Startup Conclave",
  OTHER: "Other",
};

/** Activities that are permanently read-only for students. */
export const COMPLETED_ONLY_TYPES: ActivityType[] = [
  "SUMMER_INTERNSHIP",
  "CAPSTONE",
  "STARTUP_CONCLAVE",
];

/** URL slug for each completed activity's admin page, and back again. */
export const COMPLETED_SLUGS = {
  SUMMER_INTERNSHIP: "summer-internship",
  CAPSTONE: "capstone",
  STARTUP_CONCLAVE: "startup-conclave",
} as const satisfies Partial<Record<ActivityType, string>>;

export type CompletedSlug = (typeof COMPLETED_SLUGS)[keyof typeof COMPLETED_SLUGS];

export const SLUG_TO_TYPE: Record<CompletedSlug, ActivityType> = {
  "summer-internship": "SUMMER_INTERNSHIP",
  capstone: "CAPSTONE",
  "startup-conclave": "STARTUP_CONCLAVE",
};

/** The per-student file categories that belong to each completed activity. */
export const CATEGORIES_BY_ACTIVITY: Record<string, ResourceCategory[]> = {
  SUMMER_INTERNSHIP: ["REPORT_1", "REPORT_2", "REPORT_3", "OTHER"],
  CAPSTONE: ["CAPSTONE_REPORT_1", "CAPSTONE_REPORT_2", "CAPSTONE_EXCEL", "OTHER"],
  STARTUP_CONCLAVE: ["STARTUP_CONCLAVE", "OTHER"],
};
