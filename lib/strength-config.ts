// Every weight and threshold of the Unicelerate strength index, with why.
// How it works: docs/STRENGTH-INDEX.md. The index is our own estimate from
// open data, never a QS/THE-style ranking.

// How much each signal counts. Missing signals are left out and the rest
// are re-weighted, so a school is judged only on what we know about it.
//
// For US schools the College Scorecard outcomes (graduation, earnings,
// admitted students' SAT, retention: 70 of 100) outweigh the research
// signals (30): a strong teaching college publishes little, and research
// metrics alone would put it next to weak colleges. Outside the US only the
// research signals exist, so there the index is research-based (said on
// the page).
export const STRENGTH_WEIGHTS = {
  graduation: 25, // % finishing within 6 years (Scorecard)
  earnings: 20, // median earnings 10 years after entry (Scorecard)
  sat: 15, // SAT midpoint of admitted students (Scorecard)
  retention: 10, // % of first-years returning (Scorecard)
  leiden: 15, // research impact percentile (Leiden Ranking Open Edition)
  openalex: 10, // citations: h-index and 2-year mean citedness (OpenAlex)
  carnegie: 5, // research level (Carnegie, via Scorecard): small, it's coarse
  verified_ranking: 15, // a ranking entered from its public page (none yet)
} as const;

export type StrengthSignalKey = keyof typeof STRENGTH_WEIGHTS;

// Leiden and OpenAlex both measure research from the same publication data,
// so for confidence they count as ONE independent signal ("research").
export const SIGNAL_GROUPS: Record<StrengthSignalKey, string> = {
  graduation: "graduation",
  earnings: "earnings",
  sat: "sat",
  retention: "retention",
  leiden: "research",
  openalex: "research",
  carnegie: "carnegie",
  verified_ranking: "verified_ranking",
};

// OpenAlex citation figures only count for schools with at least this many
// works: below that, an h-index or mean citedness rests on a handful of
// papers and says more about chance than strength.
export const OPENALEX_MIN_WORKS = 200;

// A verified ranking becomes 0-100 on a log scale up to this rank (a rank of
// 1 → 100, this rank or worse → 0), like rankScore in lib/matching.ts.
export const VERIFIED_RANK_SCALE = 2000;

// Confidence from the number of independent signals:
//   High: 4 or more. Medium: 2-3, or a research-impact or verified-ranking
//   figure on its own (a well-founded measure). Low: everything else, which
//   is also when the index is ESTIMATED from similar schools instead.
export const HIGH_CONFIDENCE_SIGNALS = 4;
export const MEASURED_MIN_SIGNALS = 2;

// Estimates: the average index of at least this many measured peers (same
// country and institution type; if too few, same country; then same type;
// then everyone), shown as the peers' middle half (25th-75th percentile).
export const MIN_PEERS = 5;
export const ESTIMATE_RANGE_QUANTILES = [0.25, 0.75] as const;

// Tiers by where the index falls among all measured schools in our list
// (the share of them below it): A top 10%, B next 20%, C next 30%, D next
// 25%, E bottom 15%. Fixed shares, so a tier means the same thing every
// time the data is refreshed.
export const TIER_CUTOFFS: { tier: StrengthTier; minPercentile: number }[] = [
  { tier: "A", minPercentile: 90 },
  { tier: "B", minPercentile: 70 },
  { tier: "C", minPercentile: 40 },
  { tier: "D", minPercentile: 15 },
  { tier: "E", minPercentile: 0 },
];

export type StrengthTier = "A" | "B" | "C" | "D" | "E";
export type StrengthConfidence = "High" | "Medium" | "Low";

// Order of Carnegie research levels, lowest first (percentile among US schools).
export const CARNEGIE_ORDER = ["non_doctoral", "doctoral_professional", "high", "very_high"] as const;
