"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateProfileForm,
  type ProfileFieldErrors,
} from "@/lib/profile-validation";

export type ProfileFormState =
  | {
      error?: string;
      fieldErrors?: ProfileFieldErrors;
      // What the student typed, so the form can refill itself. React 19
      // resets a form after its action runs, which would otherwise wipe
      // their input whenever validation fails.
      values?: Record<string, string>;
    }
  | undefined;

// Single-value inputs to echo back. Tag inputs (majors, countries) and the
// degree-level select keep their own state, so they don't need this.
const ECHOED_FIELDS = [
  "full_name",
  "country",
  "gpa_percentage",
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
    };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...result.data });

  if (error) {
    return { error: error.message, values: submittedValues(formData) };
  }

  redirect("/recommendations");
}
