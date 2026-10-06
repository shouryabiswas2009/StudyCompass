import type { PrimaryFocus, Profile, ResearchIntensity } from "@/lib/types";

// "What matters most to me": one choice per student that steers both the
// match score (lib/matching.ts, the "focus" factor) and the default weights
// on the offers page (lib/offers.ts). Kept in one file so every label and
// description the student sees comes from the same place.

export const FOCUS_LABELS: Record<PrimaryFocus, string> = {
  balanced: "Balanced",
  academic: "Academic reputation",
  work_experience: "Work experience",
  research: "Research",
  affordability: "Affordability",
};

// The one-line description under each option on the profile form. It
// names the signals actually used, so it never promises data we don't have.
export const FOCUS_DESCRIPTIONS: Record<PrimaryFocus, string> = {
  balanced: "No single thing comes first: scores use your budget, major, grades and countries as usual.",
  academic: "Rankings (overall and in your subject) and how many students stay and graduate.",
  work_experience: "Co-op / internship programs and graduates' earnings 10 years after starting.",
  research: "How research-intensive the university is (Carnegie classification) and your subject's ranking.",
  affordability: "The lowest total cost — tuition plus living costs — compared with your budget.",
};

// Profiles saved before migration_008 have no primary_focus. Treat them as
// "balanced", which scores exactly as the app did before the focus existed.
export function focusOf(profile: Pick<Profile, "primary_focus">): PrimaryFocus {
  return profile.primary_focus ?? "balanced";
}

export const RESEARCH_LABELS: Record<ResearchIntensity, string> = {
  very_high: "Very high research activity (R1)",
  high: "High research activity (R2)",
  doctoral_professional: "Doctoral/professional university",
  non_doctoral: "Not a doctoral research university",
};

// How much each Carnegie level counts toward the research focus, 0..1.
// Hand-chosen and evenly spaced over the doctoral levels: R1 is the most
// research-intensive category, a non-doctoral school (mostly teaching-
// focused) gets nothing for research.
export const RESEARCH_SCORES: Record<ResearchIntensity, number> = {
  very_high: 1,
  high: 0.7,
  doctoral_professional: 0.4,
  non_doctoral: 0,
};
