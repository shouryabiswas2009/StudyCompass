import Link from "next/link";
import { MatchScoreBadge } from "@/components/universities/match-score-badge";
import { ChanceBadge } from "@/components/universities/chance-badge";
import { FitBreakdown } from "@/components/universities/fit-breakdown";
import { AdmissionEstimate } from "@/components/universities/admission-estimate";
import { StrengthsConcerns } from "@/components/universities/strengths-concerns";
import { WhatIfPanel } from "@/components/universities/what-if-panel";
import { focusSummary, focusesOf } from "@/lib/focus";
import { totalYearlyCost } from "@/lib/compare";
import { describeGrades } from "@/lib/grades";
import { APPROX_NOTE, approxInCurrency, currencyName } from "@/lib/display-currency";
import type { MatchEntry } from "@/lib/matching";
import type { Profile, UniversitySummary } from "@/lib/types";

// "Your fit" on a university's page: match score, chance, the reasons, the
// admission estimate and the What if? sliders. No server-only code, so it
// works both in the server page for a student's own school and in the
// browser island on the cached public page.
export function FitSection({
  entry,
  profile,
  university,
}: {
  entry: MatchEntry;
  profile: Profile;
  university: UniversitySummary;
}) {
  return (
    <div className="mt-8 rounded-2xl border p-5">
      {profile.preferred_degree_level !== "Undergraduate" && (
        <p className="mb-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Tuition, admission rate and test scores on this page are undergraduate figures unless stated;{" "}
          {profile.preferred_degree_level} fees and admission differ, so check the program&apos;s own page.
        </p>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-medium">Your fit</h2>
        <MatchScoreBadge score={entry.match.score} />
        <ChanceBadge chance={entry.match.chance} source={entry.match.chanceSource} probability={entry.prediction?.probability} />
      </div>
      <p className="-mt-2 mb-2 text-sm font-medium">{entry.rank.reason}</p>
      <CostsInCurrency profile={profile} university={university} />
      <p className="mb-4 text-sm text-muted-foreground">
        Your grades: {describeGrades(profile.gpa_percentage, profile.grade_system, profile.grade_basis)}. Scored with
        your focuses: <strong>{focusSummary(focusesOf(profile))}</strong>.{" "}
        <Link href="/profile" className="underline">
          Change it
        </Link>
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <FitBreakdown factors={entry.match.factors} />
        <StrengthsConcerns explanation={entry.explanation} />
      </div>
      <div className="mt-6 border-t pt-5">
        <h3 className="mb-3 text-sm font-medium">Admission estimate</h3>
        <AdmissionEstimate prediction={entry.prediction} degreeLevel={profile.preferred_degree_level} />
      </div>
      <div className="mt-6 border-t pt-5">
        <WhatIfPanel profile={profile} university={university} />
      </div>
    </div>
  );
}

// The yearly costs in the student's "also show amounts in" currency.
function CostsInCurrency({ profile, university }: { profile: Profile; university: UniversitySummary }) {
  const currency = profile.display_currency;
  const parts = [
    ["tuition", approxInCurrency(university.tuition, currency)],
    ["living", approxInCurrency(university.living_cost_per_year, currency)],
    ["total", approxInCurrency(totalYearlyCost(university), currency)],
  ].filter(([, text]) => text);
  if (!currency || parts.length === 0) return null;
  return (
    <p className="mb-2 text-sm text-muted-foreground">
      In {currencyName(currency)}: {parts.map(([label, text]) => `${label} ${text}`).join(", ")} a year ({APPROX_NOTE}).
    </p>
  );
}
