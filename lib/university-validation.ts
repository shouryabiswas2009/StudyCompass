import { readList, readNumber, readText } from "@/lib/form-data";
import {
  COOP_PROGRAMS,
  DEGREE_LEVELS,
  RESEARCH_INTENSITIES,
  type CoopProgram,
  type DegreeLevel,
  type ResearchIntensity,
  type UniversityInput,
} from "@/lib/types";

export type UniversityFieldErrors = Partial<Record<keyof UniversityInput, string>>;

export type UniversityValidationResult =
  | { ok: true; data: UniversityInput }
  | { ok: false; errors: UniversityFieldErrors };

const isBad = (n: number | null) => n !== null && Number.isNaN(n);

// An optional link: null when blank, the cleaned-up URL when it's a valid
// http(s) address, false when it isn't. Only http(s), so it's always a safe
// thing to render as a link.
function readHttpUrl(formData: FormData, name: string): string | null | false {
  const raw = readText(formData, name);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : false;
  } catch {
    return false;
  }
}

// Validates the "add / edit a university" form. Same approach as
// lib/profile-validation.ts: one plain function, one clear message per
// field, and limits that match the database checks in migrations 004/005.
export function validateUniversityForm(formData: FormData): UniversityValidationResult {
  const errors: UniversityFieldErrors = {};

  const name = readText(formData, "name");
  if (!name) errors.name = "Please enter the university's name.";
  else if (name.length > 200) errors.name = "Name is too long (200 characters max).";

  const country = readText(formData, "country");
  if (!country) errors.country = "Please enter the country.";

  const tuition = readNumber(formData, "tuition");
  if (tuition === null || isBad(tuition) || tuition < 0) {
    errors.tuition = "Enter yearly tuition in USD (0 or more).";
  }

  // Optional: many smaller schools aren't in the QS ranking at all.
  const qs_ranking = readNumber(formData, "qs_ranking");
  if (qs_ranking !== null && (isBad(qs_ranking) || !Number.isInteger(qs_ranking) || qs_ranking < 1)) {
    errors.qs_ranking = "Ranking must be a whole number of 1 or more (or leave it blank).";
  }

  const acceptance_rate = readNumber(formData, "acceptance_rate");
  if (acceptance_rate === null || isBad(acceptance_rate) || acceptance_rate < 0 || acceptance_rate > 100) {
    errors.acceptance_rate = "Acceptance rate must be a percentage from 0 to 100.";
  }

  const avg_admitted_gpa = readNumber(formData, "avg_admitted_gpa");
  if (avg_admitted_gpa !== null && (isBad(avg_admitted_gpa) || avg_admitted_gpa < 0 || avg_admitted_gpa > 100)) {
    errors.avg_admitted_gpa = "Typical admitted GPA must be from 0 to 100.";
  }

  // SAT range: both ends or neither, each 400–1600 in steps of 10.
  const sat_25 = readNumber(formData, "sat_25");
  const sat_75 = readNumber(formData, "sat_75");
  const validSat = (n: number | null) =>
    n !== null && !isBad(n) && Number.isInteger(n) && n >= 400 && n <= 1600 && n % 10 === 0;
  if (sat_25 !== null || sat_75 !== null) {
    if (!validSat(sat_25) || !validSat(sat_75)) {
      errors.sat_25 = "Enter both ends of the SAT range, each from 400 to 1600 in steps of 10.";
    } else if ((sat_25 as number) > (sat_75 as number)) {
      errors.sat_25 = "The 25th percentile can't be higher than the 75th.";
    }
  }

  const min_ielts = readNumber(formData, "min_ielts");
  if (
    min_ielts !== null &&
    (isBad(min_ielts) || min_ielts < 0 || min_ielts > 9 || !Number.isInteger(min_ielts * 2))
  ) {
    errors.min_ielts = "Minimum IELTS must be from 0 to 9 in steps of 0.5.";
  }

  const living_cost_per_year = readNumber(formData, "living_cost_per_year");
  if (living_cost_per_year !== null && (isBad(living_cost_per_year) || living_cost_per_year < 0)) {
    errors.living_cost_per_year = "Living cost must be 0 or more.";
  }

  const popular_programs = readList(formData, "popular_programs");
  if (popular_programs.length === 0) {
    errors.popular_programs = "Add at least one program, so the school can match your majors.";
  }

  const degree_levels = readList(formData, "degree_levels");
  if (degree_levels.length === 0 || !degree_levels.every((l) => DEGREE_LEVELS.includes(l as DegreeLevel))) {
    errors.degree_levels = "Pick at least one degree level.";
  }

  const description = readText(formData, "description");
  if (description.length > 1000) {
    errors.description = "Description is too long (1000 characters max).";
  }

  // Optional link to where the student got their figures (e.g. the
  // university's admissions page). Only http(s) links, so it's always a safe
  // thing to render as a link.
  const source_url = readHttpUrl(formData, "source_url");
  if (source_url === false) {
    errors.source_url = "Enter a full web address starting with https:// (or leave it blank).";
  }

  // Optional focus signals. Blank ("Not sure") is stored as null — unknown,
  // never "no".
  const researchRaw = readText(formData, "research_intensity");
  const research_intensity = researchRaw ? (researchRaw as ResearchIntensity) : null;
  if (research_intensity !== null && !RESEARCH_INTENSITIES.includes(research_intensity)) {
    errors.research_intensity = "Choose a research level from the list (or Not sure).";
  }

  // "Not sure" is stored as 'unknown', which scoring leaves out — never
  // read as "no co-op".
  const coop_program = (readText(formData, "coop_program") || "unknown") as CoopProgram;
  if (!COOP_PROGRAMS.includes(coop_program)) {
    errors.coop_program = "Choose one of the options (or Not sure).";
  }
  const internship_support_url = readHttpUrl(formData, "internship_support_url");
  if (internship_support_url === false) {
    errors.internship_support_url = "Enter a full web address starting with https:// (or leave it blank).";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      country,
      // Safe casts: every branch that leaves these null/NaN set an error above.
      tuition: tuition as number,
      qs_ranking,
      acceptance_rate: acceptance_rate as number,
      avg_admitted_gpa,
      sat_25,
      sat_75,
      min_ielts,
      living_cost_per_year,
      popular_programs,
      degree_levels: degree_levels as DegreeLevel[],
      description,
      source_url: source_url || null,
      research_intensity,
      coop_program,
      internship_support_url: internship_support_url || null,
    },
  };
}
