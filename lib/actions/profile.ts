"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { VISA_MODES } from "@/lib/visa";
import { SECTION_FIELDS, isProfileSection, mergeSectionForm } from "@/lib/profile-sections";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import {
  validateProfileForm,
  type ProfileFieldErrors,
} from "@/lib/profile-validation";
import { skippedNotice, writeSkippingPendingColumns } from "@/lib/pending-migrations";

export type ProfileFormState =
  | {
      error?: string;
      // Saved, but with a caveat (e.g. a column whose migration isn't run).
      notice?: string;
      fieldErrors?: ProfileFieldErrors;
      // What the student typed, so the form can refill itself. React 19
      // resets a form after its action runs, which would otherwise wipe
      // their input whenever validation fails.
      values?: Record<string, string>;
      focuses?: string[]; // ticked checkboxes, echoed like `values`
    }
  | undefined;

// Single-value inputs to echo back. Tag inputs (majors, countries) and the
// degree-level select keep their own state, so they don't need this.
const ECHOED_FIELDS = [
  "full_name",
  "country",
  "gpa_percentage",
  "grade_input",
  "ielts_score",
  "sat_score",
  "budget_min",
  "budget_max",
];

function submittedValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    ECHOED_FIELDS.map((name) => [name, String(formData.get(name) ?? "")])
  );
}

export async function saveProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to save a profile." };
  }

  // Validate on the server even though the inputs have min/max attributes:
  // browser checks are easy to bypass.
  const result = validateProfileForm(formData);
  if (!result.ok) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: result.errors,
      values: submittedValues(formData),
      focuses: formData.getAll("focuses").map(String),
    };
  }

  // If migration_009 hasn't been run yet, the profile still saves without
  // focuses, and the student is told why their choice didn't stick.
  const {
    result: { error },
    skipped,
  } = await writeSkippingPendingColumns({ id: user.id, ...result.data }, (row) =>
    supabase.from("profiles").upsert(row)
  );

  if (error) {
    return { error: error.message, values: submittedValues(formData), focuses: formData.getAll("focuses").map(String) };
  }
  if (skipped.length > 0) {
    return { notice: skippedNotice(skipped), values: submittedValues(formData), focuses: formData.getAll("focuses").map(String) };
  }

  redirect("/recommendations");
}

// The quick "Visa and work rights" switch on the recommendations page.
// Only changes visa_mode; the weight and the stay question stay as saved
// (Medium and "unsure" count until the student sets them on the profile).
export async function setVisaMode(formData: FormData): Promise<void> {
  const mode = String(formData.get("visa_mode") ?? "");
  if (!(VISA_MODES as readonly string[]).includes(mode)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await writeSkippingPendingColumns({ visa_mode: mode }, (row) => supabase.from("profiles").update(row).eq("id", user.id));
  revalidatePath("/recommendations");
}

export type SectionState =
  | {
      ok?: boolean;
      savedAt?: number;
      error?: string;
      notice?: string;
      fieldErrors?: ProfileFieldErrors;
      values?: Record<string, string>;
    }
  | undefined;

// Saves one section of the profile page (lib/profile-sections.ts): the
// saved profile with only this section's fields replaced, validated as a
// whole by the same rules as before, so a section can never wipe another.
export async function saveProfileSection(_prev: SectionState, formData: FormData): Promise<SectionState> {
  const section = String(formData.get("section") ?? "");
  if (!isProfileSection(section)) return { error: "Unknown section." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to save your profile." };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  if (!profile) return { error: "Create your profile first (the form below saves everything at once)." };

  const echo = Object.fromEntries(SECTION_FIELDS[section].map((name) => [name, String(formData.get(name) ?? "")]));
  const result = validateProfileForm(mergeSectionForm(profile, section, formData));
  if (!result.ok) {
    const own = Object.keys(result.errors).some((k) => SECTION_FIELDS[section].includes(k));
    return {
      error: own ? "Please fix the highlighted fields." : "Another section has a problem; check the fields marked there.",
      fieldErrors: result.errors,
      values: echo,
    };
  }

  const {
    result: { error },
    skipped,
  } = await writeSkippingPendingColumns({ id: user.id, ...result.data }, (row) => supabase.from("profiles").upsert(row));
  if (error) return { error: "Couldn't save. Please try again.", values: echo };

  revalidatePath("/profile");
  revalidatePath("/recommendations");
  return { ok: true, savedAt: Date.now(), notice: skipped.length ? skippedNotice(skipped) : undefined };
}
