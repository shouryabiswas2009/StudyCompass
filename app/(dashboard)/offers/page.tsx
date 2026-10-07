import type { Metadata } from "next";
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
import { canonicalCountry } from "@/lib/countries";
import { getCountryInfo } from "@/lib/data/country-info";
import { CountryGuidance } from "@/components/universities/country-guidance";

export const metadata: Metadata = { title: "Compare your offers" };

type OfferApplication = Application & { universities: University };

export default async function OffersPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");


  // Admitted offers, plus an accepted one — accepting doesn't make the
  // comparison stop being useful until you've actually enrolled.
  const [{ data: profile }, { data: applications }, countryInfo] = await Promise.all([
    // Everything at once (they don't depend on each other).
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase
      .from("applications")
      .select("*, universities(*)")
      .eq("user_id", user.id)
      .in("status", ["admitted", "accepted"])
      .returns<OfferApplication[]>(),
    getCountryInfo(),
  ]);

  if (!profile) redirect("/profile");
  // One guidance card per destination country among the offers.
  const offerCountries = [
    ...new Set((applications ?? []).map((a) => canonicalCountry(a.universities.country))),
  ].sort();

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
      acceptBy: application.accept_by ?? null,
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

      {offerCountries.length > 0 && (
        <div className="mt-10 space-y-6">
          <h2 className="text-lg font-semibold">Visas and work, by country</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {offerCountries.map((country) => (
              <div key={country} className="rounded-2xl border p-4">
                <CountryGuidance
                  country={country}
                  info={countryInfo.byCountry.get(country) ?? null}
                  pending={countryInfo.pending}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
