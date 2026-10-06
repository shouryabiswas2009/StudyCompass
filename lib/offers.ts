import { usd } from "@/lib/format";
import type { Application } from "@/lib/types";

// ─── Costs ───────────────────────────────────────────────────────────────

// What a year actually costs after the scholarship. A scholarship can also
// cover living costs, so it comes off the total, which never goes below 0.
// Unknown (null) when tuition or living cost isn't filled in — comparing a
// full cost against a tuition-only cost would make the second look cheaper.
export function netCostPerYear(
  application: Pick<Application, "tuition_per_year" | "living_cost_per_year" | "scholarship_per_year">
): number | null {
  const { tuition_per_year: tuition, living_cost_per_year: living } = application;
  if (tuition === null || living === null) return null;
  return Math.max(0, tuition + living - application.scholarship_per_year);
}

export function totalProgramCost(
  application: Pick<
    Application,
    "tuition_per_year" | "living_cost_per_year" | "scholarship_per_year" | "duration_years"
  >
): number | null {
  const perYear = netCostPerYear(application);
  return perYear === null ? null : perYear * application.duration_years;
}

// ─── Ranking offers ──────────────────────────────────────────────────────

// Everything rankOffers needs about one offer, already looked up by the page.
export type OfferInput = {
  id: string;
  universityName: string;
  totalCost: number | null;
  overallRank: number | null;
  // The ranking for the student's major, when the school has one.
  subjectRank: number | null;
  subjectLabel: string | null;
  matchScore: number; // 0-100, from computeMatchScore
  inPreferredCountry: boolean;
};

export type OfferCriterion = "cost" | "ranking" | "subjectRanking" | "match" | "country";

// How much each criterion matters, 0-10 (the sliders on the offers page).
export type OfferWeights = Record<OfferCriterion, number>;

export const DEFAULT_OFFER_WEIGHTS: OfferWeights = {
  cost: 5,
  ranking: 3,
  subjectRanking: 3,
  match: 2,
  country: 1,
};

export const CRITERION_LABELS: Record<OfferCriterion, string> = {
  cost: "Total cost",
  ranking: "Overall ranking",
  subjectRanking: "Subject ranking",
  match: "Match score",
  country: "Preferred country",
};

// Generic so callers can pass extra fields (e.g. for display) and get them
// back on `offer` with their types intact.
export type RankedOffer<T extends OfferInput = OfferInput> = {
  offer: T;
  position: number; // 1 = best
  score: number; // 0-100
  // 0..1 per criterion, or null when unknown for this offer.
  criteria: Record<OfferCriterion, number | null>;
  reason: string;
};

// Scales values so the best offer gets 1 and the worst gets 0. If every
// offer has the same value, the criterion can't separate them, so all get 1.
function relativeScores(
  values: (number | null)[],
  better: "higher" | "lower"
): (number | null)[] {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return values.map(() => null);
  const min = Math.min(...known);
  const max = Math.max(...known);
  return values.map((v) => {
    if (v === null) return null;
    if (max === min) return 1;
    return better === "higher" ? (v - min) / (max - min) : (max - v) / (max - min);
  });
}

// Rankings are compared on a log scale: going from #10 to #5 is a much
// bigger deal than going from #210 to #205.
const logRank = (rank: number | null) => (rank === null ? null : Math.log(rank));

// Scores each offer 0-100 from the five criteria and the student's weights,
// then sorts best first. Like the match score, a criterion that's unknown
// for an offer (e.g. no subject ranking) is left out of that offer's score
// instead of counting as zero.
export function rankOffers<T extends OfferInput>(
  offers: T[],
  weights: OfferWeights
): RankedOffer<T>[] {
  const cost = relativeScores(offers.map((o) => o.totalCost), "lower");
  const ranking = relativeScores(offers.map((o) => logRank(o.overallRank)), "lower");
  const subject = relativeScores(offers.map((o) => logRank(o.subjectRank)), "lower");

  const scored = offers.map((offer, i) => {
    const criteria: Record<OfferCriterion, number | null> = {
      cost: cost[i],
      ranking: ranking[i],
      subjectRanking: subject[i],
      match: offer.matchScore / 100,
      country: offer.inPreferredCountry ? 1 : 0,
    };

    let earned = 0;
    let possible = 0;
    for (const key of Object.keys(criteria) as OfferCriterion[]) {
      const value = criteria[key];
      if (value === null || weights[key] <= 0) continue;
      earned += weights[key] * value;
      possible += weights[key];
    }
    const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;

    return { offer, criteria, score };
  });

  // Best score first; ties broken by cheaper total cost, then by name so the
  // order is always the same.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (a.offer.totalCost ?? Infinity) - (b.offer.totalCost ?? Infinity) ||
      a.offer.universityName.localeCompare(b.offer.universityName)
  );

  return scored.map((s, i) => ({
    ...s,
    position: i + 1,
    reason: explainOffer(s.offer, s.criteria, weights, i + 1),
  }));
}

// ─── Plain-language reasons ─────────────────────────────────────────────

function strongPhrase(key: OfferCriterion, offer: OfferInput, value: number): string {
  switch (key) {
    case "cost":
      return `${value === 1 ? "the lowest" : "a low"} total cost (${usd(offer.totalCost ?? 0)})`;
    case "ranking":
      return `a strong overall ranking (#${offer.overallRank})`;
    case "subjectRanking":
      return `a strong ${offer.subjectLabel} ranking (#${offer.subjectRank})`;
    case "match":
      return `a high match score (${offer.matchScore}%)`;
    case "country":
      return "being in one of your preferred countries";
  }
}

function weakPhrase(key: OfferCriterion, offer: OfferInput): string {
  switch (key) {
    case "cost":
      return `its higher total cost (${usd(offer.totalCost ?? 0)})`;
    case "ranking":
      return offer.overallRank === null ? "having no overall ranking" : `its overall ranking (#${offer.overallRank})`;
    case "subjectRanking":
      return `its ${offer.subjectLabel} ranking (#${offer.subjectRank})`;
    case "match":
      return `its lower match score (${offer.matchScore}%)`;
    case "country":
      return "not being in your preferred countries";
  }
}

// "#1 mainly because of X and Y. Its weak spot is Z." Strengths and weak
// spots are the criteria that count most for this student (weight × value).
function explainOffer(
  offer: OfferInput,
  criteria: Record<OfferCriterion, number | null>,
  weights: OfferWeights,
  position: number
): string {
  const active = (Object.keys(criteria) as OfferCriterion[]).filter(
    (key) => criteria[key] !== null && weights[key] > 0
  );

  const strengths = active
    .filter((key) => (criteria[key] as number) >= 0.75)
    .sort((a, b) => weights[b] * (criteria[b] as number) - weights[a] * (criteria[a] as number))
    .slice(0, 2)
    .map((key) => strongPhrase(key, offer, criteria[key] as number));

  const weakSpot = active
    .filter((key) => (criteria[key] as number) <= 0.25)
    .sort((a, b) => weights[b] * (1 - (criteria[b] as number)) - weights[a] * (1 - (criteria[a] as number)))[0];

  const parts: string[] = [];
  parts.push(
    strengths.length > 0
      ? `#${position} mainly because of ${strengths.join(" and ")}.`
      : `#${position}: no single standout strength for what you weighted most.`
  );
  if (weakSpot) parts.push(`Its weak spot is ${weakPhrase(weakSpot, offer)}.`);
  return parts.join(" ");
}

// ─── Summary ─────────────────────────────────────────────────────────────

export type OfferSummary<T extends OfferInput = OfferInput> = {
  bestOverall: T | null;
  cheapest: T | null;
  highestRanked: T | null;
};

export function summarizeOffers<T extends OfferInput>(ranked: RankedOffer<T>[]): OfferSummary<T> {
  const offers = ranked.map((r) => r.offer);
  const withCost = offers.filter((o) => o.totalCost !== null);
  const withRank = offers.filter((o) => o.overallRank !== null);

  return {
    bestOverall: ranked[0]?.offer ?? null,
    cheapest: withCost.length
      ? withCost.reduce((a, b) => ((b.totalCost as number) < (a.totalCost as number) ? b : a))
      : null,
    highestRanked: withRank.length
      ? withRank.reduce((a, b) => ((b.overallRank as number) < (a.overallRank as number) ? b : a))
      : null,
  };
}
