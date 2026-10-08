import { STRENGTH_WEIGHTS, type StrengthSignalKey } from "@/lib/strength-config";
import { majorField } from "@/lib/research-impact";
import type { Profile, UniversitySummary } from "@/lib/types";

// How the Unicelerate strength index is shown and used in the app. The
// index itself is computed at import time (lib/strength.ts); nothing here
// recomputes it from raw data.

export const STRENGTH_LABEL = "Strength (Unicelerate index)";
export const STRENGTH_DISCLAIMER =
  "Our own estimate from open data, not an official ranking like QS or THE.";

export const SIGNAL_INFO: Record<StrengthSignalKey, { label: string; source: string; licence: string; url: string }> = {
  graduation: { label: "Graduation rate", source: "College Scorecard", licence: "CC BY", url: "https://collegescorecard.ed.gov/data/" },
  earnings: { label: "Median earnings 10 years after entry", source: "College Scorecard", licence: "CC BY", url: "https://collegescorecard.ed.gov/data/" },
  sat: { label: "SAT midpoint of admitted students", source: "College Scorecard", licence: "CC BY", url: "https://collegescorecard.ed.gov/data/" },
  retention: { label: "First-year retention", source: "College Scorecard", licence: "CC BY", url: "https://collegescorecard.ed.gov/data/" },
  leiden: { label: "Research impact", source: "CWTS Leiden Ranking Open Edition 2025", licence: "CC0", url: "https://open.leidenranking.com" },
  openalex: { label: "Citations (h-index and 2-year mean citedness)", source: "OpenAlex", licence: "CC0", url: "https://openalex.org" },
  carnegie: { label: "Research level (Carnegie)", source: "College Scorecard", licence: "CC BY", url: "https://collegescorecard.ed.gov/data/" },
  verified_ranking: { label: "Ranking entered from its public page", source: "See the university's sources", licence: "", url: "" },
};

export const CONFIDENCE_TEXT = {
  High: "High confidence: four or more independent signals",
  Medium: "Medium confidence: two or three signals, or research impact alone",
  Low: "Low confidence: estimated from similar schools",
} as const;

// The index for this student: the stored figure, except that research
// impact counts in the student's own field when the school has a Leiden
// figure for it (the same weights, so it's the stored index with one
// percentile swapped). Null when the school has no index (a student's own
// school, or before migration_019).
export function strengthForStudent(profile: Pick<Profile, "intended_majors"> | null, university: UniversitySummary): number | null {
  const index = university.strength_index;
  if (index === null || index === undefined) return null;
  const details = university.strength_signals;
  const fields = university.research_impact?.fields;
  if (university.strength_is_estimate || !details?.signals.leiden || !fields) return Number(index);
  for (const major of profile?.intended_majors ?? []) {
    const field = majorField(major);
    const fieldPercentile = field ? fields[field] : undefined;
    if (typeof fieldPercentile !== "number") continue;
    let sum = 0;
    let weight = 0;
    for (const [key, s] of Object.entries(details.signals) as [StrengthSignalKey, { percentile: number }][]) {
      const p = key === "leiden" ? fieldPercentile : s.percentile;
      sum += STRENGTH_WEIGHTS[key] * p;
      weight += STRENGTH_WEIGHTS[key];
    }
    return Math.round((sum / weight) * 10) / 10;
  }
  return Number(index);
}

export type StrengthSummary = {
  tier: string;
  value: string; // "71" or "est. 45–58"
  position: string; // "#412 of 1,688" or "about #300–#700 of 1,688"
  confidence: "High" | "Medium" | "Low";
  isEstimate: boolean;
};

const fmt = (n: number) => n.toLocaleString("en-US");
const oneDecimal = (n: number) => String(Math.round(Number(n)));

export function strengthSummary(u: UniversitySummary): StrengthSummary | null {
  if (u.strength_index === null || u.strength_index === undefined || !u.strength_tier || !u.strength_confidence) return null;
  const of = u.strength_signals?.of;
  const ofText = of ? ` of ${fmt(of)}` : "";
  if (u.strength_is_estimate) {
    const [best, worst] = u.strength_signals?.position_range ?? [u.strength_position ?? 0, u.strength_position ?? 0];
    return {
      tier: u.strength_tier,
      value: `est. ${oneDecimal(u.strength_low ?? u.strength_index)}–${oneDecimal(u.strength_high ?? u.strength_index)}`,
      position: `about #${fmt(best)}–#${fmt(worst)}${ofText}`,
      confidence: "Low",
      isEstimate: true,
    };
  }
  return {
    tier: u.strength_tier,
    value: oneDecimal(u.strength_index),
    position: `#${fmt(u.strength_position ?? 0)}${ofText}`,
    confidence: u.strength_confidence,
    isEstimate: false,
  };
}

// Only rankings someone entered from the ranking's own public page
// (curated rows) or a student's own figure; never the illustrative sample
// rankings the demo data once had.
export function hasVerifiedRanking(u: UniversitySummary): boolean {
  return (u.source === "curated" || u.source === "user-entered") && (u.qs_ranking != null || Object.keys(u.program_rankings ?? {}).length > 0);
}
