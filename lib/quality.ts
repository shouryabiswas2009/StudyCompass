import { rankScore, subjectRanking } from "@/lib/matching";
import { RESEARCH_SCORES } from "@/lib/focus";
import { RESEARCH_FIELD_LABELS, researchImpactFor } from "@/lib/research-impact";
import {
  QUALITY_MIN_KNOWN_WEIGHT,
  QUALITY_RANGES,
  QUALITY_UNDERGRADUATE_SIGNALS,
  QUALITY_WEIGHTS,
} from "@/lib/scoring-config";
import type { Profile, UniversitySummary } from "@/lib/types";

// "How strong is this school?", from 0 to 1, built only from figures we
// actually have. Separate from fit ("does it work for me?") on purpose: an
// easy school that fits your budget isn't a strong school.
//
// Each signal becomes 0..1; quality is their weighted average over the ones
// we know (weights in lib/scoring-config.ts). With too little known, the
// answer is null: "quality not available", never a guess.

export type QualityKey = keyof typeof QUALITY_WEIGHTS;
export type QualityPart = { key: QualityKey; label: string; value: number };
export type Quality = { score: number | null; parts: QualityPart[] };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const isKnown = (v: number | null | undefined): v is number => v !== null && v !== undefined && !Number.isNaN(v);
const scale = (value: number, { low, high }: { low: number; high: number }) => clamp01((value - low) / (high - low));

// Rankings only count when they were entered from the public ranking page
// (curated rows) or by the student themselves. The rankings left on the
// original sample schools are illustrative, so they're not used here.
function verifiedRankings(university: UniversitySummary): boolean {
  return university.source === "curated" || university.source === "user-entered";
}

export function qualityScore(profile: Profile, university: UniversitySummary): Quality {
  const parts: QualityPart[] = [];
  const add = (key: QualityKey, label: string, value: number | null) => {
    if (value !== null) parts.push({ key, label, value: clamp01(value) });
  };

  if (verifiedRankings(university)) {
    add("ranking", "Overall ranking", isKnown(university.qs_ranking) ? rankScore(university.qs_ranking) : null);
    const subject = subjectRanking(profile, university);
    add("subjectRanking", "Subject ranking", subject ? rankScore(subject.rank) : null);
  }

  const { sat_25, sat_75, completion_rate, retention_rate, median_earnings_10yr, research_intensity, acceptance_rate } = university;
  add("sat", "SAT of admitted students", isKnown(sat_25) && isKnown(sat_75) ? scale((sat_25 + sat_75) / 2, QUALITY_RANGES.sat) : null);
  add("completion", "Graduation rate", isKnown(completion_rate) ? scale(completion_rate, QUALITY_RANGES.completion) : null);
  add("retention", "Retention rate", isKnown(retention_rate) ? scale(retention_rate, QUALITY_RANGES.retention) : null);
  // Earnings on a log scale: $35k → $70k matters more than $110k → $145k.
  const earnings = isKnown(median_earnings_10yr) && median_earnings_10yr > 0 ? median_earnings_10yr : null;
  const { low, high } = QUALITY_RANGES.earnings;
  add("earnings", "Graduate earnings", earnings === null ? null : (Math.log(earnings) - Math.log(low)) / (Math.log(high) - Math.log(low)));
  add("research", "Research activity", research_intensity ? RESEARCH_SCORES[research_intensity] : null);
  const impact = researchImpactFor(profile, university);
  add(
    "researchImpact",
    impact?.field ? `Research impact in ${RESEARCH_FIELD_LABELS[impact.field].toLowerCase()}` : "Research impact",
    impact ? impact.percentile / 100 : null
  );
  // A small, rough proxy: schools that turn most applicants away tend to be
  // stronger, but selectivity isn't quality, so it counts little.
  add("selectivity", "Selectivity", isKnown(acceptance_rate) ? 1 - acceptance_rate / 100 : null);

  // Quality is about the undergraduate experience, so it needs at least one
  // direct signal of it (a ranking, admitted students' SAT, graduation or
  // retention). Research status and earnings alone can belong to a mostly-
  // graduate institution.
  const hasUndergraduateSignal = parts.some((p) => QUALITY_UNDERGRADUATE_SIGNALS.includes(p.key));
  const knownWeight = parts.reduce((sum, p) => sum + QUALITY_WEIGHTS[p.key], 0);
  if (!hasUndergraduateSignal || knownWeight < QUALITY_MIN_KNOWN_WEIGHT) return { score: null, parts };
  const weighted = parts.reduce((sum, p) => sum + QUALITY_WEIGHTS[p.key] * p.value, 0);
  return { score: weighted / knownWeight, parts };
}
