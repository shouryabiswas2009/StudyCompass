"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateUniversityForm,
  type UniversityFieldErrors,
} from "@/lib/university-validation";

export type UniversityFormState =
  | {
      error?: string;
      fieldErrors?: UniversityFieldErrors;
      // What the student typed, so the form can refill itself after
      // React 19 resets it (see lib/actions/profile.ts for the same idea).
      values?: Record<string, string>;
      degreeLevels?: string[];
    }
  | undefined;

const ECHOED_FIELDS = [
  "name",
  "country",
  "tuition",
  "qs_ranking",
  "acceptance_rate",
  "avg_admitted_gpa",
  "sat_25",
  "sat_75",
  "min_ielts",
  "living_cost_per_year",
  "description",
];

function submittedValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    ECHOED_FIELDS.map((name) => [name, String(formData.get(name) ?? "")])
  );
}

function refreshListings() {
  revalidatePath("/universities");
  revalidatePath("/recommendations");
  revalidatePath("/saved");
}

export async function createUniversity(
  _prevState: UniversityFormState,
  formData: FormData
): Promise<UniversityFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to add a university." };

  const result = validateUniversityForm(formData);
  if (!result.ok) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: result.errors,
      values: submittedValues(formData),
      degreeLevels: formData.getAll("degree_levels").map(String),
    };
  }

  // created_by marks the row as this student's; RLS also refuses any insert
  // where it isn't their own id, so this can't be faked from the browser.
  const { data, error } = await supabase
    .from("universities")
    .insert({ ...result.data, created_by: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message, values: submittedValues(formData) };

  refreshListings();
  redirect(`/universities/${data.id}`);
}

// `id` is bound in the edit page: updateUniversity.bind(null, id).
export async function updateUniversity(
  id: string,
  _prevState: UniversityFormState,
  formData: FormData
): Promise<UniversityFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to edit a university." };

  const result = validateUniversityForm(formData);
  if (!result.ok) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: result.errors,
      values: submittedValues(formData),
      degreeLevels: formData.getAll("degree_levels").map(String),
    };
  }

  // RLS silently skips rows you don't own, so check that a row was updated
  // instead of assuming success.
  const { data, error } = await supabase
    .from("universities")
    .update(result.data)
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message, values: submittedValues(formData) };
  if (!data || data.length === 0) {
    return { error: "You can only edit universities you added yourself." };
  }

  refreshListings();
  revalidatePath(`/universities/${id}`);
  redirect(`/universities/${id}`);
}

export async function deleteUniversity(id: string): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to delete a university." };

  const { data, error } = await supabase
    .from("universities")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "You can only delete universities you added yourself." };
  }

  refreshListings();
  redirect("/universities");
}
