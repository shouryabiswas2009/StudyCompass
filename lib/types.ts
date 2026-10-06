// Shared types matching the Supabase schema in supabase/seed.sql plus the
// numbered migrations in supabase/.

export type DegreeLevel = "Undergraduate" | "Masters" | "PhD";

export const DEGREE_LEVELS: DegreeLevel[] = ["Undergraduate", "Masters", "PhD"];

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
};

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
>;

export type SavedUniversity = {
  id: string;
  user_id: string;
  university_id: string;
  created_at: string;
};
