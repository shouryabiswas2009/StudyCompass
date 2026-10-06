"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isApplicationStatus,
  validateApplicationForm,
  type ApplicationFieldErrors,
} from "@/lib/application-validation";
import type { DegreeLevel, University } from "@/lib/types";

// Typical program lengths, used only as a starting value the student edits.
const DEFAULT_DURATION: Record<DegreeLevel, number> = {
  Undergraduate: 4,
  Masters: 2,
  PhD: 4,
};

function refresh() {
  revalidatePath("/applications");
  revalidatePath("/offers");
  revalidatePath("/saved");
}

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Starts tracking a university. Tuition and living cost are copied from the
// school so the offer math works straight away; the student can change them
// once they have the real numbers from their offer letter.
export async function addApplication(universityId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "You must be logged in to track applications." };

  const [{ data: university }, { data: profile }] = await Promise.all([
    supabase
      .from("universities")
      .select("tuition, living_cost_per_year")
      .eq("id", universityId)
      .maybeSingle<Pick<University, "tuition" | "living_cost_per_year">>(),
    supabase
      .from("profiles")
      .select("preferred_degree_level")
      .eq("id", user.id)
      .maybeSingle<{ preferred_degree_level: DegreeLevel }>(),
  ]);

  if (!university) return { error: "That university couldn't be found." };

  const { error } = await supabase.from("applications").insert({
    user_id: user.id,
    university_id: universityId,
    tuition_per_year: university.tuition,
    living_cost_per_year: university.living_cost_per_year,
    duration_years: DEFAULT_DURATION[profile?.preferred_degree_level ?? "Undergraduate"],
  });

  if (error) {
    // 23505 = unique violation: it's already being tracked, which is fine.
    if (error.code === "23505") return {};
    return { error: error.message };
  }

  refresh();
  return {};
}

export async function updateApplicationStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  if (!isApplicationStatus(status)) return { error: "Unknown status." };

  const { supabase, user } = await getUser();
  if (!user) return { error: "You must be logged in." };

  // RLS skips rows you don't own without an error, so check a row changed.
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Application not found." };

  refresh();
  return {};
}

export type ApplicationFormState =
  | {
      error?: string;
      fieldErrors?: ApplicationFieldErrors;
      saved?: boolean;
    }
  | undefined;

// `id` is bound by the form: updateApplication.bind(null, id).
export async function updateApplication(
  id: string,
  _prevState: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "You must be logged in." };

  const result = validateApplicationForm(formData);
  if (!result.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors: result.errors };
  }

  const { data, error } = await supabase
    .from("applications")
    .update(result.data)
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Application not found." };

  refresh();
  return { saved: true };
}

export async function removeApplication(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "You must be logged in." };

  const { data, error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Application not found." };

  refresh();
  return {};
}
