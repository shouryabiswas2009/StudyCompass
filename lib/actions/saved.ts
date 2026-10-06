"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Toggles a bookmark on/off. `wasSaved` tells us which direction to flip.
export async function toggleSavedUniversity(
  universityId: string,
  wasSaved: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to save universities.");
  }

  if (wasSaved) {
    await supabase
      .from("saved_universities")
      .delete()
      .eq("user_id", user.id)
      .eq("university_id", universityId);
  } else {
    await supabase
      .from("saved_universities")
      .insert({ user_id: user.id, university_id: universityId });
  }

  revalidatePath("/saved");
  revalidatePath("/recommendations");
}
