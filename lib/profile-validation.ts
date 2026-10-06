import { readList, readNumber, readText } from "@/lib/form-data";
import {
  DEGREE_LEVELS,
  PRIMARY_FOCUSES,
  type DegreeLevel,
  type PrimaryFocus,
  type ProfileInput,
} from "@/lib/types";

export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, string>>;

export type ProfileValidationResult =
  | { ok: true; data: ProfileInput }
  | { ok: false; errors: ProfileFieldErrors };

// Kept as a plain function (no form library) so it can be unit-tested and
// so every rule is visible in one place. The same limits are enforced again
// by check constraints in supabase/migration_003_scores_and_degree_levels.sql.
export function validateProfileForm(formData: FormData): ProfileValidationResult {
  const errors: ProfileFieldErrors = {};

  const full_name = readText(formData, "full_name");
  if (!full_name) errors.full_name = "Please enter your name.";

  const country = readText(formData, "country");
  if (!country) errors.country = "Please enter the country you live in.";

  const intended_majors = readList(formData, "intended_majors");
  if (intended_majors.length === 0) {
    errors.intended_majors = "Add at least one major you're considering.";
  }

  const preferred_countries = readList(formData, "preferred_countries");
  if (preferred_countries.length === 0) {
    errors.preferred_countries = "Add at least one country you'd like to study in.";
  }

  const gpa = readNumber(formData, "gpa_percentage");
  if (gpa === null || Number.isNaN(gpa) || gpa < 0 || gpa > 100) {
    errors.gpa_percentage = "GPA / percentage must be a number from 0 to 100.";
  }

  // IELTS bands go up in halves, so 6.5 is valid but 6.3 isn't.
  const ielts = readNumber(formData, "ielts_score");
  if (
    ielts !== null &&
    (Number.isNaN(ielts) || ielts < 0 || ielts > 9 || !Number.isInteger(ielts * 2))
  ) {
    errors.ielts_score = "IELTS must be from 0 to 9 in steps of 0.5 (e.g. 6.5).";
  }

  // SAT totals are always multiples of 10.
  const sat = readNumber(formData, "sat_score");
  if (
    sat !== null &&
    (Number.isNaN(sat) || !Number.isInteger(sat) || sat < 400 || sat > 1600 || sat % 10 !== 0)
  ) {
    errors.sat_score = "SAT must be from 400 to 1600 in steps of 10 (e.g. 1350).";
  }

  const budget_min = readNumber(formData, "budget_min") ?? 0;
  const budget_max = readNumber(formData, "budget_max");
  if (budget_max === null || Number.isNaN(budget_max) || budget_max <= 0) {
    errors.budget_max = "Enter the most you can spend per year.";
  } else if (Number.isNaN(budget_min) || budget_min < 0) {
    errors.budget_min = "Minimum budget can't be negative.";
  } else if (budget_min > budget_max) {
    errors.budget_min = "Minimum budget can't be more than your maximum.";
  }

  const level = readText(formData, "preferred_degree_level");
  if (!DEGREE_LEVELS.includes(level as DegreeLevel)) {
    errors.preferred_degree_level = "Choose a degree level.";
  }

  // Not choosing is the same as "balanced" (the database default too).
  const primary_focus = readText(formData, "primary_focus") || "balanced";
  if (!PRIMARY_FOCUSES.includes(primary_focus as PrimaryFocus)) {
    errors.primary_focus = "Choose what matters most to you.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      full_name,
      country,
      intended_majors,
      preferred_countries,
      // Safe casts: every branch that leaves these null/NaN set an error above.
      gpa_percentage: gpa as number,
      ielts_score: ielts,
      sat_score: sat,
      budget_min,
      budget_max: budget_max as number,
      preferred_degree_level: level as DegreeLevel,
      primary_focus: primary_focus as PrimaryFocus,
    },
  };
}
