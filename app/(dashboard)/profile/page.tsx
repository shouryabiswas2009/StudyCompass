import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { DeleteAccount } from "@/components/profile/delete-account";
import { MyReports, type MyReport } from "@/components/profile/my-reports";
import type { Profile } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Route protection already happens in proxy.ts, but `user` is still
  // typed as possibly-null here, so guard before querying with it.
  const [{ data: profile }, { data: reports }] = user
    ? await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
        // Row level security returns only this student's reports; an error
        // (e.g. migration_018 not run yet) just means none are shown.
        supabase
          .from("figure_reports")
          .select("id, field, suggested_value, status, created_at, universities(name)")
          .order("created_at", { ascending: false })
          .limit(20)
          .returns<MyReport[]>(),
      ])
    : [{ data: null }, { data: null }];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold">Your student profile</h1>
        <p className="text-muted-foreground">
          This is what we use to match you with universities — budget,
          country, and academic background.
        </p>
      </div>

      <ProfileForm existingProfile={profile} />

      {reports && reports.length > 0 && <MyReports reports={reports} />}

      {user && <DeleteAccount />}
    </div>
  );
}
