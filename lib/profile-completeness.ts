import { focusesOf } from "@/lib/focus";
import type { ProfileSection } from "@/lib/profile-sections";
import type { Profile } from "@/lib/types";

// "6 of 9 filled in": a plain count of real fields, never a made-up
// percentage, with what each missing one changes. Shown at the top of the
// profile page.

export type CompletenessItem = {
  key: string;
  label: string;
  section: ProfileSection;
  why: string; // what adding it changes
  filled: (p: Profile) => boolean;
};

export const COMPLETENESS_ITEMS: CompletenessItem[] = [
  { key: "country", label: "Home country", section: "about", why: "Shows visa guidance and money in context.", filled: (p) => Boolean(p.country) },
  { key: "grades", label: "Your grades", section: "academics", why: "Drives every admission estimate and the academic fit.", filled: (p) => typeof p.gpa_percentage === "number" },
  { key: "ielts", label: "English test (IELTS)", section: "academics", why: "Adding IELTS lets us check schools' English requirements.", filled: (p) => p.ielts_score !== null && p.ielts_score !== undefined },
  { key: "sat", label: "SAT", section: "academics", why: "Adding SAT lets us estimate admission chances for US schools.", filled: (p) => p.sat_score !== null && p.sat_score !== undefined },
  { key: "majors", label: "Intended majors", section: "study", why: "Matches schools that teach your subject.", filled: (p) => (p.intended_majors ?? []).length > 0 },
  { key: "countries", label: "Preferred countries", section: "study", why: "Puts schools in the countries you want first.", filled: (p) => (p.preferred_countries ?? []).length > 0 },
  { key: "budget", label: "Budget", section: "money", why: "Budget fit is the biggest part of the match score.", filled: (p) => p.budget_max > 0 },
  { key: "focuses", label: "What matters most", section: "priorities", why: "Tilts scoring towards reputation, work experience, research or cost.", filled: (p) => focusesOf(p).length > 0 },
  {
    key: "visa",
    label: "Visa and work rights choice",
    section: "priorities",
    why: "Decide whether post-study work and visa rules should count.",
    filled: (p) => p.visa_mode !== null && p.visa_mode !== undefined,
  },
];

export type Completeness = { filled: number; total: number; missing: CompletenessItem[] };

export function profileCompleteness(profile: Profile | null): Completeness {
  const total = COMPLETENESS_ITEMS.length;
  if (!profile) return { filled: 0, total, missing: [...COMPLETENESS_ITEMS] };
  const missing = COMPLETENESS_ITEMS.filter((item) => !item.filled(profile));
  return { filled: total - missing.length, total, missing };
}
