"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { VISA_MODES } from "@/lib/visa";
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
