"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

export type AuthFormState = { error?: string; message?: string } | undefined;

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Supabase's own message here ("Email not confirmed") doesn't tell the
    // student what to do next.
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Please confirm your email first — check your inbox (and spam folder) for the confirmation link.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/recommendations");
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The deployed address (see lib/site-url.ts), so the email doesn't
      // point at localhost once the site is live.
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, Supabase won't return a session yet.
  if (!data.session) {
    return {
      message:
        "Account created! Check your email to confirm it before logging in.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
