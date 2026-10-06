import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import type { Profile } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Route protection already happens in proxy.ts, but `user` is still
  // typed as possibly-null here, so guard before querying with it.
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle<Profile>()
    : { data: null };

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
    </div>
  );
}
