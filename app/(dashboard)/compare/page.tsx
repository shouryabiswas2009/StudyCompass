import { createClient } from "@/lib/supabase/server";
import { CompareSelectors } from "@/components/universities/compare-selectors";
import { CompareTable } from "@/components/universities/compare-table";
import type { Profile, University } from "@/lib/types";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: universities } = await supabase
    .from("universities")
    .select("id, name")
    .order("name")
    .returns<{ id: string; name: string }[]>();

  const [{ data: universityA }, { data: universityB }, { data: profile }] =
    await Promise.all([
      a
        ? supabase.from("universities").select("*").eq("id", a).maybeSingle<University>()
        : Promise.resolve({ data: null }),
      b
        ? supabase.from("universities").select("*").eq("id", b).maybeSingle<University>()
        : Promise.resolve({ data: null }),
      user
        ? supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>()
        : Promise.resolve({ data: null }),
    ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold">Compare universities</h1>
        <p className="text-muted-foreground">
          Pick two universities to see tuition, ranking, and programs side by
          side.
        </p>
      </div>

      <CompareSelectors
        universities={universities ?? []}
        selectedA={a}
        selectedB={b}
      />

      <div className="mt-8">
        {universityA && universityB ? (
          <CompareTable
            universityA={universityA}
            universityB={universityB}
            profile={profile ?? null}
          />
        ) : (
          <p className="text-muted-foreground">
            Select two universities above to compare them.
          </p>
        )}
      </div>
    </div>
  );
}
