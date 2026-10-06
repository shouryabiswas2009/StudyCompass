import { readNumber, readText } from "@/lib/form-data";
import {
  APPLICATION_STATUSES,
  type ApplicationInput,
  type ApplicationStatus,
} from "@/lib/types";

export type ApplicationFieldErrors = Partial<Record<keyof ApplicationInput, string>>;

export type ApplicationValidationResult =
  | { ok: true; data: ApplicationInput }
  | { ok: false; errors: ApplicationFieldErrors };

const isBad = (n: number | null) => n !== null && Number.isNaN(n);

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

// A real calendar date in YYYY-MM-DD form (what <input type="date"> sends).
// "2027-02-30" is rejected because JavaScript rolls it over to March 2.
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Same pattern as the profile and university validators; limits match the
// check constraint in supabase/migration_006_applications.sql.
export function validateApplicationForm(formData: FormData): ApplicationValidationResult {
  const errors: ApplicationFieldErrors = {};

  const status = readText(formData, "status");
  if (!isApplicationStatus(status)) errors.status = "Choose a status.";

  const program = readText(formData, "program");
  if (program.length > 200) errors.program = "Program name is too long (200 characters max).";

  const deadlineRaw = readText(formData, "deadline");
  if (deadlineRaw && !isValidDate(deadlineRaw)) errors.deadline = "Enter a valid date.";

  const tuition_per_year = readNumber(formData, "tuition_per_year");
  if (isBad(tuition_per_year) || (tuition_per_year !== null && tuition_per_year < 0)) {
    errors.tuition_per_year = "Tuition must be 0 or more (or leave it blank).";
  }

  const scholarship = readNumber(formData, "scholarship_per_year") ?? 0;
  if (Number.isNaN(scholarship) || scholarship < 0) {
    errors.scholarship_per_year = "Scholarship must be 0 or more.";
  }

  const living_cost_per_year = readNumber(formData, "living_cost_per_year");
  if (isBad(living_cost_per_year) || (living_cost_per_year !== null && living_cost_per_year < 0)) {
    errors.living_cost_per_year = "Living cost must be 0 or more (or leave it blank).";
  }

  const duration = readNumber(formData, "duration_years");
  if (duration === null || Number.isNaN(duration) || duration <= 0 || duration > 10) {
    errors.duration_years = "Program length must be more than 0 and at most 10 years.";
  }

  const notes = readText(formData, "notes");
  if (notes.length > 2000) errors.notes = "Notes are too long (2000 characters max).";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      status: status as ApplicationStatus,
      program,
      deadline: deadlineRaw || null,
      tuition_per_year,
      scholarship_per_year: scholarship,
      living_cost_per_year,
      // Safe cast: a null/invalid duration set an error above.
      duration_years: duration as number,
      notes,
    },
  };
}
