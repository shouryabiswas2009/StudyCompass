import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { scoreUniversity } from "@/lib/matching";
import { UniversityBoard } from "@/components/universities/university-board";
import { Button } from "@/components/ui/button";
import type { Profile, University } from "@/lib/types";

// Every university the student can see: the shared list plus any they added
// themselves (RLS decides which rows come back). Unlike recommendations,
// nothing is hidden by degree level here — that's a filter they can choose.
export default async function BrowseUniversitiesPage() {
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

  // Cards show a match score, which needs the profile.
  if (!profile) redirect("/profile");

  const [{ data: universities }, { data: saved }] = await Promise.all([
    supabase.from("universities").select("*").order("name").returns<University[]>(),
    supabase.from("saved_universities").select("university_id").eq("user_id", user.id),
  ]);

  const savedIds = new Set((saved ?? []).map((row) => row.university_id));
  const entries = (universities ?? [])
    .map((university) => scoreUniversity(profile, university))
    .sort((a, b) => b.match.score - a.match.score);

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
        matches={entries}
        savedIds={savedIds}
        showDegreeFilter
        emptyMessage="No universities yet."
      />
    </div>
  );
}
