import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getVisibleUniversities } from "@/lib/data/universities";
import { offersDegreeLevel, scoreUniversity } from "@/lib/matching";
import { focusesOf, joinFocuses } from "@/lib/focus";
import { buildBoard, parseBoardParams, topPicksByCountry } from "@/lib/university-filters";
import { UniversityBoard } from "@/components/universities/university-board";
import { TopPicks } from "@/components/universities/top-picks";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = parseBoardParams(await searchParams);
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ data: profile }, universities, { data: saved }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    getVisibleUniversities(supabase, user.id),
    supabase.from("saved_universities").select("university_id").eq("user_id", user.id),
  ]);

  // No profile yet — we need it to compute matches, so send them there first.
  if (!profile) redirect("/profile");

  const scored = universities
    // Schools without the student's degree level aren't recommendations at
    // all, so leave them out rather than showing them with a 0% score.
    .filter((university) => offersDegreeLevel(profile, university))
    .map((university) => scoreUniversity(profile, university));
  const board = buildBoard(scored, state, { withFeatured: true });
  const focuses = focusesOf(profile);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Your recommendations</h1>
          <p className="text-muted-foreground">
            Matched to your budget, preferred countries, and intended majors
            {focuses.length === 0
              ? "."
              : `, with extra weight on what matters most to you: ${joinFocuses(focuses)}.`}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/profile">Edit profile</Link>
        </Button>
      </div>

      {/* Only on the first page, so it doesn't repeat while paging. */}
      {state.page === 1 && board.matchingCount > 0 && (
        <TopPicks groups={topPicksByCountry(board.pool, profile.preferred_countries)} />
      )}

      <UniversityBoard
        entries={board.entries}
        state={{ ...state, page: board.page }}
        totalPages={board.totalPages}
        matchingCount={board.matchingCount}
        countries={board.countries}
        featured={board.featured}
        savedIds={new Set((saved ?? []).map((row) => row.university_id))}
        emptyMessage={`No universities offering ${profile.preferred_degree_level} programs yet. Try a different degree level on your profile.`}
      />
    </div>
  );
}
