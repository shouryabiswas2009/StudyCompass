import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getVisibleUniversities } from "@/lib/data/universities";
import { scoreUniversity } from "@/lib/matching";
import { buildBoard, parseBoardParams } from "@/lib/university-filters";
import { UniversityBoard } from "@/components/universities/university-board";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

// Every university the student can see: the shared list plus any they added
// themselves. Unlike recommendations, nothing is hidden by degree level here
// — that's a filter they can choose. Filtering, sorting and paging happen
// here on the server; only one page of cards goes to the browser.
export default async function BrowseUniversitiesPage({
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

  // Cards show a match score, which needs the profile.
  if (!profile) redirect("/profile");

  const scored = universities.map((university) => scoreUniversity(profile, university));
  const board = buildBoard(scored, state, { withFeatured: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Browse universities</h1>
          <p className="text-muted-foreground">
            Search and filter every school, scored against your profile.
          </p>
        </div>
        <Button asChild>
          <Link href="/universities/new">
            <Plus className="size-4" />
            Add a university
          </Link>
        </Button>
      </div>

      <UniversityBoard
        entries={board.entries}
        state={{ ...state, page: board.page }}
        totalPages={board.totalPages}
        matchingCount={board.matchingCount}
        countries={board.countries}
        featured={board.featured}
        savedIds={new Set((saved ?? []).map((row) => row.university_id))}
        showDegreeFilter
        emptyMessage="No universities yet."
      />
    </div>
  );
}
