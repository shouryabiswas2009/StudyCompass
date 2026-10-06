import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeMatchScore, explainMatch, getDisplayRanking } from "@/lib/matching";
import { UniversityBoard } from "@/components/universities/university-board";
import { Button } from "@/components/ui/button";
import type { Profile, University } from "@/lib/types";

export default async function SavedPage() {
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

  if (!profile) redirect("/profile");

  const { data: saved } = await supabase
    .from("saved_universities")
    .select("university_id, universities(*)")
    .eq("user_id", user.id)
    .returns<{ university_id: string; universities: University }[]>();

  const universities = (saved ?? []).map((row) => row.universities);

  const matches = universities.map((university) => ({
    university,
    score: computeMatchScore(profile, university),
    explanation: explainMatch(profile, university),
    ranking: getDisplayRanking(university, profile),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Saved universities</h1>
          <p className="text-muted-foreground">
            Universities you&apos;ve bookmarked while exploring.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/recommendations">Browse recommendations</Link>
        </Button>
      </div>

      <UniversityBoard
        matches={matches}
        savedIds={new Set(universities.map((u) => u.id))}
        emptyMessage={
          <>
            You haven&apos;t saved any universities yet. Bookmark one from
            your{" "}
            <Link href="/recommendations" className="underline">
              recommendations
            </Link>{" "}
            to see it here.
          </>
        }
      />
    </div>
  );
}
