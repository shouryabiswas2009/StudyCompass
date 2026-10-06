"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DegreeLevel } from "@/lib/types";

export type ProfileFormState = { error?: string } | undefined;

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

  const ieltsRaw = formData.get("ielts_score") as string;
  const budgetMinRaw = formData.get("budget_min") as string;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: formData.get("full_name") as string,
    country: formData.get("country") as string,
    intended_majors: formData.getAll("intended_majors") as string[],
    gpa_percentage: Number(formData.get("gpa_percentage")),
    ielts_score: ieltsRaw ? Number(ieltsRaw) : null,
    budget_min: budgetMinRaw ? Number(budgetMinRaw) : 0,
    budget_max: Number(formData.get("budget_max")),
    preferred_countries: formData.getAll("preferred_countries") as string[],
    preferred_degree_level: formData.get(
      "preferred_degree_level"
    ) as DegreeLevel,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/recommendations");
}
