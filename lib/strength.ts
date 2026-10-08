// The Unicelerate strength index (0-100): our own labelled estimate of how
// strong a university is, from open data only. Computed ONCE at import time
// (scripts/strength/build.mjs) and stored in the database; the app only
// reads it. Weights and thresholds: lib/strength-config.ts. How it works and
// why: docs/STRENGTH-INDEX.md. Tests: lib/strength.test.ts.
//
// Plain relative imports (with .ts) so Node can run this file directly in
// the import script, as well as inside the app.
import {
  CARNEGIE_ORDER,
  ESTIMATE_RANGE_QUANTILES,
  HIGH_CONFIDENCE_SIGNALS,
  MEASURED_MIN_SIGNALS,
  MIN_PEERS,
  OPENALEX_MIN_WORKS,
  SIGNAL_GROUPS,
  STRENGTH_WEIGHTS,
  TIER_CUTOFFS,
  VERIFIED_RANK_SCALE,
  type StrengthConfidence,
  type StrengthSignalKey,
  type StrengthTier,
} from "./strength-config.ts";

// ─── Import time ─────────────────────────────────────────────────────────

export type OpenAlexStats = {
  works_count: number;
  cited_by_count: number;
  h_index: number;
  i10_index: number;
  mean_citedness_2yr: number;
};

// Everything we know about one school that the index can use.
export type StrengthSchool = {
  key: string;
  name: string;
  country: string;
  // Peer group for estimates: US schools by Carnegie level, others "university".
  peerType: string;
  graduation?: number | null; // %
  retention?: number | null; // %
  earnings?: number | null; // US$
  sat?: number | null; // midpoint
  carnegie?: (typeof CARNEGIE_ORDER)[number] | null;
  leiden?: number | null; // research impact percentile, 0-100
  openalex?: OpenAlexStats | null;
  verifiedRank?: number | null;
};

export type SignalValue = { value: number; percentile: number };

export type StrengthResult = {
  key: string;
  index: number; // 0-100, one decimal; for an estimate, the peers' average
  low: number | null; // estimate range (null when measured)
  high: number | null;
  tier: StrengthTier;
  confidence: StrengthConfidence;
  isEstimate: boolean;
  position: number; // #N among measured schools (for an estimate: of its average)
  positionRange: [number, number] | null; // estimate: positions of high and low
  of: number; // schools in our list
  signals: Partial<Record<StrengthSignalKey, SignalValue>>;
  peerGroup: string | null;
  peerCount: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const known = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

// value → share of the OTHER values below it, 0-100, ties counting half.
export function percentileMap(values: number[]): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const map = new Map<number, number>();
  for (let i = 0; i < n; ) {
    let j = i;
    while (j < n && sorted[j] === sorted[i]) j++;
    map.set(sorted[i], n < 2 ? 50 : (100 * (i + (j - i - 1) / 2)) / (n - 1));
    i = j;
  }
  return map;
}

// Linear-interpolated quantile of sorted values (q from 0 to 1).
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

export function verifiedRankPercentile(rank: number): number {
  return Math.max(0, Math.min(100, 100 * (1 - Math.log(rank) / Math.log(VERIFIED_RANK_SCALE))));
}

export function tierFor(percentileAmongMeasured: number): StrengthTier {
  return TIER_CUTOFFS.find((c) => percentileAmongMeasured >= c.minPercentile)!.tier;
}

// Weighted average of the signal percentiles a school has.
export function weightedIndex(signals: Partial<Record<StrengthSignalKey, { percentile: number }>>): number | null {
  let sum = 0;
  let weight = 0;
  for (const key of Object.keys(signals) as StrengthSignalKey[]) {
    sum += STRENGTH_WEIGHTS[key] * signals[key]!.percentile;
    weight += STRENGTH_WEIGHTS[key];
  }
  return weight > 0 ? sum / weight : null;
}

export function independentSignals(signals: Partial<Record<StrengthSignalKey, unknown>>): number {
  return new Set((Object.keys(signals) as StrengthSignalKey[]).map((k) => SIGNAL_GROUPS[k])).size;
}

export function computeStrength(schools: StrengthSchool[]): StrengthResult[] {
  // 1. Each signal as a percentile among comparable schools: Scorecard
  //    signals among the schools that report them; OpenAlex among our
  //    schools with enough works; Leiden is already a percentile (among its
  //    2,831 universities); a verified rank uses a fixed log scale.
  const pmap = (pick: (s: StrengthSchool) => number | null | undefined) =>
    percentileMap(schools.map(pick).filter(known));
  const graduation = pmap((s) => s.graduation);
  const retention = pmap((s) => s.retention);
  const earnings = pmap((s) => s.earnings);
  const sat = pmap((s) => s.sat);
  const carnegieRank = (s: StrengthSchool) => (s.carnegie ? CARNEGIE_ORDER.indexOf(s.carnegie) : null);
  const carnegie = pmap(carnegieRank);
  const eligible = (s: StrengthSchool) => (s.openalex && s.openalex.works_count >= OPENALEX_MIN_WORKS ? s.openalex : null);
  const hIndex = pmap((s) => eligible(s)?.h_index);
  const citedness = pmap((s) => eligible(s)?.mean_citedness_2yr);

  const measuredSignals = schools.map((s) => {
    const signals: Partial<Record<StrengthSignalKey, SignalValue>> = {};
    const add = (key: StrengthSignalKey, value: number | null | undefined, percentile: number | undefined) => {
      if (known(value) && percentile !== undefined) signals[key] = { value, percentile: round1(percentile) };
    };
    add("graduation", s.graduation, known(s.graduation) ? graduation.get(s.graduation) : undefined);
    add("retention", s.retention, known(s.retention) ? retention.get(s.retention) : undefined);
    add("earnings", s.earnings, known(s.earnings) ? earnings.get(s.earnings) : undefined);
    add("sat", s.sat, known(s.sat) ? sat.get(s.sat) : undefined);
    const c = carnegieRank(s);
    add("carnegie", c, c !== null ? carnegie.get(c) : undefined);
    add("leiden", s.leiden, known(s.leiden) ? s.leiden : undefined);
    const oa = eligible(s);
    // h-index (size and impact) and 2-year mean citedness (impact per paper), averaged.
    add("openalex", oa?.h_index, oa ? (hIndex.get(oa.h_index)! + citedness.get(oa.mean_citedness_2yr)!) / 2 : undefined);
    add("verified_ranking", s.verifiedRank, known(s.verifiedRank) ? verifiedRankPercentile(s.verifiedRank) : undefined);
    return signals;
  });

  // 2. Measured or estimated. A single signal (other than a research-impact
  //    or verified-ranking figure) is too thin to place a school.
  const isEstimate = measuredSignals.map((signals) => {
    const n = independentSignals(signals);
    return n === 0 || (n < MEASURED_MIN_SIGNALS && !signals.leiden && !signals.verified_ranking);
  });
  const indexOf = measuredSignals.map((signals, i) => (isEstimate[i] ? null : weightedIndex(signals)));
  const measuredSorted = indexOf.filter(known).sort((a, b) => a - b);
  const above = (value: number) => measuredSorted.length - upperBound(measuredSorted, value);
  const below = (value: number) => lowerBound(measuredSorted, value);
  const percentileAmongMeasured = (value: number) =>
    measuredSorted.length < 2 ? 50 : (100 * below(value)) / (measuredSorted.length - 1);

  return schools.map((s, i) => {
    const signals = measuredSignals[i];
    const n = independentSignals(signals);
    if (!isEstimate[i]) {
      const index = round1(indexOf[i]!);
      return {
        key: s.key,
        index,
        low: null,
        high: null,
        tier: tierFor(percentileAmongMeasured(indexOf[i]!)),
        confidence: n >= HIGH_CONFIDENCE_SIGNALS ? "High" : "Medium",
        isEstimate: false,
        position: above(indexOf[i]!) + 1,
        positionRange: null,
        of: schools.length,
        signals,
        peerGroup: null,
        peerCount: null,
      };
    }
    // 3. Estimate from similar schools.
    const peers = findPeers(s, schools, indexOf);
    const sorted = peers.values.sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const low = quantile(sorted, ESTIMATE_RANGE_QUANTILES[0]);
    const high = quantile(sorted, ESTIMATE_RANGE_QUANTILES[1]);
    return {
      key: s.key,
      index: round1(mean),
      low: round1(low),
      high: round1(high),
      tier: tierFor(percentileAmongMeasured(mean)),
      confidence: "Low",
      isEstimate: true,
      position: above(mean) + 1,
      positionRange: [above(high) + 1, above(low) + 1],
      of: schools.length,
      signals,
      peerGroup: peers.label,
      peerCount: sorted.length,
    };
  });
}

function findPeers(school: StrengthSchool, schools: StrengthSchool[], indexOf: (number | null)[]) {
  const levels: [string, (s: StrengthSchool) => boolean][] = [
    [`${school.country}, ${school.peerType}`, (s) => s.country === school.country && s.peerType === school.peerType],
    [school.country, (s) => s.country === school.country],
    [school.peerType, (s) => s.peerType === school.peerType],
    ["all schools", () => true],
  ];
  for (const [label, same] of levels) {
    const values = schools.flatMap((s, i) => (same(s) && known(indexOf[i]) ? [indexOf[i]!] : []));
    if (values.length >= MIN_PEERS || label === "all schools") return { label, values };
  }
  throw new Error("unreachable");
}

// Index of the first element ≥ value / > value in an ascending array.
function lowerBound(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
function upperBound(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Spearman rank correlation (for the report comparing with Leiden).
export function spearman(xs: number[], ys: number[]): number {
  const ranks = (v: number[]) => {
    const p = percentileMap(v);
    return v.map((x) => p.get(x)!);
  };
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}
