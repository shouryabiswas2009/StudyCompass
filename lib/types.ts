// Shared types matching the Supabase schema in supabase/seed.sql plus the
// numbered migrations in supabase/.

export type DegreeLevel = "Undergraduate" | "Masters" | "PhD";

export const DEGREE_LEVELS: DegreeLevel[] = ["Undergraduate", "Masters", "PhD"];

// "What matters most to me" (migration_009): a student ticks any number of
// these. None ticked means Balanced. Labels, descriptions and how they
// steer scoring live in lib/focus.ts and lib/matching.ts.
export const FOCUSES = ["academic", "work_experience", "research", "affordability"] as const;

export type Focus = (typeof FOCUSES)[number];

export type Profile = {
  id: string;
  full_name: string;
  country: string;
  intended_majors: string[];
  gpa_percentage: number;
  ielts_score: number | null;
  sat_score: number | null;
  budget_min: number;
  budget_max: number;
  preferred_countries: string[];
  preferred_degree_level: DegreeLevel;
  // Missing (undefined) until migration_009 is run; read it with focusesOf().
  focuses?: Focus[];
  // The old single choice (migration_008). Migration 009 copies it into
  // focuses and drops it; only read as a fallback before 009 has run.
  primary_focus?: "balanced" | Focus;
  created_at: string;
  updated_at: string;
};

// Fields the user fills in on the profile form (id/timestamps are handled separately)
export type ProfileInput = Omit<Profile, "id" | "created_at" | "updated_at">;

export type University = {
  id: string;
  name: string;
  country: string;
  tuition: number;
  // Null for unranked schools a student added themselves.
  qs_ranking: number | null;
  // Per-subject ranking, e.g. { "Computer Science": 5 }. Not every program
  // has an entry — fall back to qs_ranking when one is missing.
  program_rankings: Record<string, number>;
  // Levels the school offers. Empty means unknown, not "offers nothing".
  degree_levels: DegreeLevel[];
  acceptance_rate: number;
  // Illustrative admission stats (migration_004). Null means unknown, e.g.
  // non-US schools have no SAT range.
  avg_admitted_gpa: number | null;
  sat_25: number | null;
  sat_75: number | null;
  min_ielts: number | null;
  living_cost_per_year: number | null;
  popular_programs: string[];
  description: string;
  // Null for the shared seed data; the student's id for a school they added.
  // RLS never returns another student's schools, so a non-null value always
  // means "added by the current student".
  created_by: string | null;
  created_at: string;

  // Where the figures come from (migration_007).
  source: UniversitySource;
  data_year: string | null; // Scorecard's own year label, e.g. "2024"
  fetched_at: string | null;
  source_url: string | null; // optional link for user-entered figures

  // Official College Scorecard fields; null for schools without them.
  scorecard_id: number | null;
  city: string | null;
  state: string | null;
  ownership: "public" | "private nonprofit" | "private for-profit" | null;
  us_region: string | null;
  tuition_in_state: number | null;
  avg_net_price: number | null;
  student_size: number | null;
  completion_rate: number | null; // % finishing within 150% of normal time
  median_earnings_10yr: number | null;

  // Signals for the student's primary focus (migration_008). Optional
  // because they're missing until that migration runs; null = not available.
  research_intensity?: ResearchIntensity | null; // Carnegie classification
  retention_rate?: number | null; // % of first-year students who return
  // Co-op / internship program (migration_009). Only filled from the school's
  // own page, with that page's URL; "unknown" is left out of scoring.
  coop_program?: CoopProgram;
  internship_support_url?: string | null;

  // Shown by default (migration_010; the rule is scripts/relevance-rule.mjs).
  // Missing until that migration runs, which the app reads as "featured".
  is_featured?: boolean;
};

export const COOP_PROGRAMS = ["mandatory", "optional", "none", "unknown"] as const;

export type CoopProgram = (typeof COOP_PROGRAMS)[number];

// What list pages need: everything except the detail-page-only figures.
// Browse and recommendations load ~1,600 of these (lib/data/universities.ts),
// so leaving out unused columns keeps that list small enough to cache.
export type UniversitySummary = Omit<University, DetailOnlyField>;

export const DETAIL_ONLY_FIELDS = [
  "description",
  "tuition_in_state",
  "avg_net_price",
  "student_size",
  "ownership",
  "us_region",
  "scorecard_id",
  "created_at",
  "median_earnings_10yr", // information only, on the details page
] as const;

type DetailOnlyField = (typeof DETAIL_ONLY_FIELDS)[number];

// Carnegie Classification research activity, as reported by College
// Scorecard: R1, R2, other doctoral/professional, or not a doctoral school.
export const RESEARCH_INTENSITIES = [
  "very_high",
  "high",
  "doctoral_professional",
  "non_doctoral",
] as const;

export type ResearchIntensity = (typeof RESEARCH_INTENSITIES)[number];

export type UniversitySource = "College Scorecard" | "illustrative" | "user-entered";

// Fields the "add a university" form fills in.
export type UniversityInput = Pick<
  University,
  | "name"
  | "country"
  | "tuition"
  | "qs_ranking"
  | "acceptance_rate"
  | "avg_admitted_gpa"
  | "sat_25"
  | "sat_75"
  | "min_ielts"
  | "living_cost_per_year"
  | "popular_programs"
  | "degree_levels"
  | "description"
  | "source_url"
  | "research_intensity"
  | "coop_program"
  | "internship_support_url"
>;

// Application tracker (migration_006). An "admitted" application doubles as
// the record of the offer that the offers page ranks.
export const APPLICATION_STATUSES = [
  "planning",
  "applied",
  "admitted",
  "waitlisted",
  "rejected",
  "accepted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type Application = {
  id: string;
  user_id: string;
  university_id: string;
  status: ApplicationStatus;
  program: string;
  deadline: string | null; // "YYYY-MM-DD"
  tuition_per_year: number | null;
  scholarship_per_year: number;
  living_cost_per_year: number | null;
  duration_years: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

// Fields the application details form edits.
export type ApplicationInput = Pick<
  Application,
  | "status"
  | "program"
  | "deadline"
  | "tuition_per_year"
  | "scholarship_per_year"
  | "living_cost_per_year"
  | "duration_years"
  | "notes"
>;

export type SavedUniversity = {
  id: string;
  user_id: string;
  university_id: string;
  created_at: string;
};
