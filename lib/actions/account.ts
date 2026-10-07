"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDeleteConfirmed } from "@/lib/account";

export type DeleteAccountState = { error?: string } | undefined;

// Deletes the signed-in student's account and all their data.
//
// It calls the database function delete_my_account() (migration_014), which
// can only delete the caller's own account. So no service-role key is
// needed anywhere: the app only ever uses the public anon key plus the
// student's own session.
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  if (!isDeleteConfirmed(formData.get("confirm"))) {
    return { error: "Type DELETE to confirm." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to delete your account." };

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    // PGRST202: the function doesn't exist yet (migration not run).
    if (error.code === "PGRST202") {
      return {
        error:
          "Account deletion isn't set up on the database yet (supabase/migration_014_delete_my_account.sql). Nothing was deleted.",
      };
    }
    return { error: `Nothing was deleted: ${error.message}` };
  }

  // The account is gone; clear this browser's session cookies too.
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/account-deleted");
}
