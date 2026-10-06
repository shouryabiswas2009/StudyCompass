import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { offersDegreeLevel, scoreUniversity } from "@/lib/matching";
import { UniversityBoard } from "@/components/universities/university-board";
import { Button } from "@/components/ui/button";
import type { Profile, University } from "@/lib/types";
import { FOCUS_LABELS, focusOf } from "@/lib/focus";

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  // No profile yet — we need it to compute matches, so send them there first.
  if (!profile) redirect("/profile");

  const [{ data: universities }, { data: saved }] = await Promise.all([
    supabase.from("universities").select("*").returns<University[]>(),
    supabase
      .from("saved_universities")
      .select("university_id")
      .eq("user_id", user.id),
  ]);

  const savedIds = new Set((saved ?? []).map((row) => row.university_id));

  const matches = (universities ?? [])
    // Schools without the student's degree level aren't recommendations at
    // all, so leave them out rather than showing them with a 0% score.
    .filter((university) => offersDegreeLevel(profile, university))
    .map((university) => scoreUniversity(profile, university))
    .sort((a, b) => b.match.score - a.match.score);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Your recommendations</h1>
          <p className="text-muted-foreground">
            Matched to your budget, preferred countries, and intended majors
            {focusOf(profile) === "balanced"
              ? "."
              : `, with extra weight on what matters most to you: ${FOCUS_LABELS[focusOf(profile)].toLowerCase()}.`}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/profile">Edit profile</Link>
        </Button>
      </div>

      <UniversityBoard
        matches={matches}
        savedIds={savedIds}
        emptyMessage={`No universities offering ${profile.preferred_degree_level} programs yet. Try a different degree level on your profile.`}
      />
    </div>
  );
}
