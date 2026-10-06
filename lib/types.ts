// Shared types matching the Supabase schema in supabase/seed.sql +
// supabase/migration_002_richer_profiles.sql

export type DegreeLevel = "Undergraduate" | "Masters" | "PhD";

export type Profile = {
  id: string;
  full_name: string;
  country: string;
  intended_majors: string[];
  gpa_percentage: number;
  ielts_score: number | null;
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
  qs_ranking: number;
  // Per-subject ranking, e.g. { "Computer Science": 5 }. Not every program
  // has an entry — fall back to qs_ranking when one is missing.
  program_rankings: Record<string, number>;
  acceptance_rate: number;
  popular_programs: string[];
  description: string;
  created_at: string;
};

export type SavedUniversity = {
  id: string;
  user_id: string;
  university_id: string;
  created_at: string;
};
