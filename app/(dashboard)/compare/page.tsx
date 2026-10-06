import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompareControls } from "@/components/universities/compare-controls";
import { CompareTable } from "@/components/universities/compare-table";
import { MAX_COMPARE, parseCompareIds } from "@/lib/compare";
import { scoreUniversity } from "@/lib/matching";
import type { Profile, University } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; a?: string; b?: string }>;
}) {
  const ids = parseCompareIds(await searchParams);
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  // Most rows compare the schools against the student's own scores.
  if (!profile) redirect("/profile");

  const [{ data: options }, { data: selected }] = await Promise.all([
    supabase
      .from("universities")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
    ids.length > 0
      ? supabase.from("universities").select("*").in("id", ids).returns<University[]>()
      : Promise.resolve({ data: [] as University[] }),
  ]);

  // Keep the order from the URL (the database returns rows in any order).
  const entries = ids
    .map((id) => (selected ?? []).find((u) => u.id === id))
    .filter((u): u is University => u !== undefined)
    .map((university) => scoreUniversity(profile, university));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold">Compare universities</h1>
        <p className="text-muted-foreground">
          Pick up to {MAX_COMPARE} universities to see costs, admission
          figures and your fit side by side.
        </p>
      </div>

      <CompareControls
        options={options ?? []}
        selectedIds={entries.map((e) => e.university.id)}
      />

      <div className="mt-8">
        {entries.length >= 2 ? (
          <CompareTable entries={entries} profile={profile} />
        ) : (
          <p className="text-muted-foreground">
            {entries.length === 1
              ? "Add at least one more university to compare."
              : "Add two or more universities above, or tick “Compare” on any university card."}
          </p>
        )}
      </div>
    </div>
  );
}
