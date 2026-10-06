import Link from "next/link";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OffersBoard, type OfferRow } from "@/components/offers/offers-board";
import { coopSignal, countryMatches, researchSignal, scoreUniversity } from "@/lib/matching";
import { focusesOf } from "@/lib/focus";
import { netCostPerYear, totalProgramCost } from "@/lib/offers";
import type { Application, Profile, University } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

type OfferApplication = Application & { universities: University };

export default async function OffersPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile) redirect("/profile");

  // Admitted offers, plus an accepted one — accepting doesn't make the
  // comparison stop being useful until you've actually enrolled.
  const { data: applications } = await supabase
    .from("applications")
    .select("*, universities(*)")
    .eq("user_id", user.id)
    .in("status", ["admitted", "accepted"])
    .returns<OfferApplication[]>();

  const offers: OfferRow[] = (applications ?? []).map((application) => {
    const university = application.universities;
    const { match, ranking } = scoreUniversity(profile, university);
    const hasSubjectRank = ranking.label !== "Overall";
    const research = researchSignal(university);
    const coop = coopSignal(university);

    return {
      id: application.id,
      universityId: university.id,
      universityName: university.name,
      status: application.status,
      netPerYear: netCostPerYear(application),
      totalCost: totalProgramCost(application),
      durationYears: application.duration_years,
      overallRank: university.qs_ranking,
      subjectRank: hasSubjectRank ? ranking.rank : null,
      subjectLabel: hasSubjectRank ? ranking.label : null,
      matchScore: match.score,
      inPreferredCountry: countryMatches(profile, university),
      researchScore: research?.value ?? null,
      researchLabel: research?.label ?? null,
      coopScore: coop?.value ?? null,
      coopLabel: coop?.label ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold">Which offer should you accept?</h1>
        <p className="text-muted-foreground">
          Your offers ranked by what matters to you. Edit costs and
          scholarships on the{" "}
          <Link href="/applications" className="underline">
            Applications
          </Link>{" "}
          page.
        </p>
      </div>

      {offers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Award className="size-5 text-muted-foreground" />
          </div>
          <p className="max-w-sm text-muted-foreground">
            No offers yet. When a school admits you, set its status to
            &ldquo;Admitted&rdquo; on the{" "}
            <Link href="/applications" className="underline">
              Applications
            </Link>{" "}
            page and it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <OffersBoard offers={offers} focuses={focusesOf(profile)} />
      )}
    </div>
  );
}
