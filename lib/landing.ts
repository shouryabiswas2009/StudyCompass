import { canonicalCountry } from "@/lib/countries";
import { computeMatchScore } from "@/lib/matching";
import { compareWhatIf, valuesFromProfile, type WhatIfComparison } from "@/lib/what-if";
import type { Profile, UniversitySummary } from "@/lib/types";

// Numbers and examples for the landing page, worked out from the real
// university list (never typed in by hand), so they stay true as data is
// added.

export type LandingStats = {
  universities: number; // every shared school (not ones students added)
  countries: number;
  verifiedTuition: number; // tuition from an official or university source
  officialUs: number; // College Scorecard (US Department of Education)
  checkedInternational: number; // checked by hand on the university's own pages
};

// "Verified" tuition means a figure from College Scorecard or copied from the
// university's own fees page (stored in its own currency, possibly without a
// US-dollar conversion). Illustrative and student-entered figures don't count.
function hasVerifiedTuition(u: UniversitySummary): boolean {
  if (u.source !== "College Scorecard" && u.source !== "curated") return false;
  return u.tuition !== null || (u.tuition_local ?? null) !== null;
}

export function landingStats(universities: UniversitySummary[]): LandingStats {
  const shared = universities.filter((u) => u.created_by === null);
  return {
    universities: shared.length,
    countries: new Set(shared.map((u) => canonicalCountry(u.country))).size,
    verifiedTuition: shared.filter(hasVerifiedTuition).length,
    officialUs: shared.filter((u) => u.source === "College Scorecard").length,
    checkedInternational: shared.filter((u) => u.source === "curated").length,
  };
}

// A made-up student used only to show what a match looks like. The landing
// page labels these scores "Example" and lists these answers next to them.
export const SAMPLE_PROFILE: Profile = {
  id: "sample",
  full_name: "Sample student",
  country: "India",
  intended_majors: ["Data Science"],
  gpa_percentage: 84,
  ielts_score: 6.5,
  sat_score: 1300,
  budget_min: 0,
  budget_max: 35000,
  preferred_countries: ["Canada", "Netherlands", "United States"],
  preferred_degree_level: "Undergraduate",
  focuses: [],
  created_at: "",
  updated_at: "",
};

export const SAMPLE_PROFILE_SUMMARY =
  "Data Science, 84% GPA, SAT 1300, IELTS 6.5, up to $35,000 a year, open to Canada, the Netherlands or the US";

export type ExampleMatch = { university: UniversitySummary; score: number };

// The sample student's best featured matches, at most one per country so the
// row shows some variety. Ties go to the school with the lower (better)
// ranking, then by name, so the choice is always the same.
export function exampleMatches(universities: UniversitySummary[], count = 3): ExampleMatch[] {
  const scored = universities
    .filter((u) => u.created_by === null && u.is_featured === true)
    .map((university) => ({ university, score: computeMatchScore(SAMPLE_PROFILE, university).score }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.university.qs_ranking ?? Infinity) - (b.university.qs_ranking ?? Infinity) ||
        a.university.name.localeCompare(b.university.name)
    );

  const picked: ExampleMatch[] = [];
  const seenCountries = new Set<string>();
  for (const match of scored) {
    const country = canonicalCountry(match.university.country);
    if (seenCountries.has(country)) continue;
    seenCountries.add(country);
    picked.push(match);
    if (picked.length === count) break;
  }
  return picked;
}

export type ExampleWhatIf = {
  university: UniversitySummary;
  satFrom: number;
  satTo: number;
  comparison: WhatIfComparison;
};

// The "What if?" preview: among featured US schools with official admission
// figures (so the admission estimate applies), the one where raising the
// sample student's SAT by 100 points moves the estimate the most, so the
// example actually shows something. Uses the same compareWhatIf() as the
// real sliders.
export function exampleWhatIf(universities: UniversitySummary[]): ExampleWhatIf | null {
  const satFrom = SAMPLE_PROFILE.sat_score ?? 1200;
  const satTo = Math.min(1600, satFrom + 100);
  const values = { ...valuesFromProfile(SAMPLE_PROFILE), sat_score: satTo };
  const candidates = universities
    .filter(
      (u) =>
        u.created_by === null &&
        u.is_featured === true &&
        u.source === "College Scorecard" &&
        u.acceptance_rate !== null &&
        u.sat_25 !== null &&
        u.sat_75 !== null
    )
    .map((university) => ({ university, comparison: compareWhatIf(SAMPLE_PROFILE, university, values) }))
    .sort(
      (a, b) =>
        (b.comparison.probabilityChange ?? 0) - (a.comparison.probabilityChange ?? 0) ||
        b.comparison.scoreChange - a.comparison.scoreChange ||
        a.university.name.localeCompare(b.university.name)
    );
  const best = candidates[0];
  return best ? { university: best.university, satFrom, satTo, comparison: best.comparison } : null;
}
