import { describe, expect, it } from "vitest";
import {
  DEFAULT_OFFER_WEIGHTS,
  netCostPerYear,
  rankOffers,
  summarizeOffers,
  totalProgramCost,
  type OfferInput,
  type OfferWeights,
} from "@/lib/offers";

function offer(overrides: Partial<OfferInput> & { id: string }): OfferInput {
  return {
    universityName: overrides.id,
    totalCost: 100000,
    overallRank: 50,
    subjectRank: null,
    subjectLabel: null,
    matchScore: 70,
    inPreferredCountry: true,
    ...overrides,
  };
}

const only = (key: keyof OfferWeights): OfferWeights => ({
  cost: 0,
  ranking: 0,
  subjectRanking: 0,
  match: 0,
  country: 0,
  [key]: 10,
});

describe("netCostPerYear / totalProgramCost", () => {
  const base = { tuition_per_year: 30000, living_cost_per_year: 15000, scholarship_per_year: 5000 };

  it("subtracts the scholarship from tuition plus living cost", () => {
    expect(netCostPerYear(base)).toBe(40000);
    expect(totalProgramCost({ ...base, duration_years: 4 })).toBe(160000);
  });

  it("never goes below zero when the scholarship covers everything", () => {
    expect(netCostPerYear({ ...base, scholarship_per_year: 60000 })).toBe(0);
  });

  it("is unknown when tuition or living cost is missing", () => {
    expect(netCostPerYear({ ...base, living_cost_per_year: null })).toBeNull();
    expect(totalProgramCost({ ...base, tuition_per_year: null, duration_years: 4 })).toBeNull();
  });
});

describe("rankOffers", () => {
  const cheapLowRanked = offer({ id: "Cheap", totalCost: 40000, overallRank: 200 });
  const pricyTopRanked = offer({ id: "Pricey", totalCost: 240000, overallRank: 5 });

  it("puts the cheaper offer first when only cost matters", () => {
    const ranked = rankOffers([pricyTopRanked, cheapLowRanked], only("cost"));
    expect(ranked.map((r) => r.offer.id)).toEqual(["Cheap", "Pricey"]);
    expect(ranked[0].score).toBe(100);
    expect(ranked[1].score).toBe(0);
  });

  it("puts the better-ranked offer first when only ranking matters", () => {
    const ranked = rankOffers([cheapLowRanked, pricyTopRanked], only("ranking"));
    expect(ranked[0].offer.id).toBe("Pricey");
  });

  it("compares rankings on a log scale (#5 vs #10 counts more than #200 vs #205)", () => {
    const ranked = rankOffers(
      [
        offer({ id: "R5", overallRank: 5 }),
        offer({ id: "R10", overallRank: 10 }),
        offer({ id: "R200", overallRank: 200 }),
        offer({ id: "R205", overallRank: 205 }),
      ],
      only("ranking")
    );
    const scoreOf = (id: string) => ranked.find((r) => r.offer.id === id)!.score;
    expect(scoreOf("R5") - scoreOf("R10")).toBeGreaterThan(scoreOf("R200") - scoreOf("R205"));
  });

  it("leaves an unknown criterion out instead of counting it as zero", () => {
    // B has no cost info; on ranking alone it ties A, so it shouldn't drop to 0.
    const ranked = rankOffers(
      [
        offer({ id: "A", totalCost: 50000, overallRank: 10 }),
        offer({ id: "B", totalCost: null, overallRank: 10 }),
      ],
      { ...only("ranking"), cost: 10 }
    );
    const b = ranked.find((r) => r.offer.id === "B")!;
    expect(b.criteria.cost).toBeNull();
    expect(b.score).toBe(100);
  });

  it("scores everything 0 when every weight is 0, without crashing", () => {
    const zero = { cost: 0, ranking: 0, subjectRanking: 0, match: 0, country: 0 };
    const ranked = rankOffers([cheapLowRanked, pricyTopRanked], zero);
    expect(ranked.every((r) => r.score === 0)).toBe(true);
  });

  it("explains the rank in plain language, including the weak spot", () => {
    const [first, second] = rankOffers([pricyTopRanked, cheapLowRanked], {
      ...DEFAULT_OFFER_WEIGHTS,
      cost: 10,
      ranking: 2,
    });
    expect(first.reason).toMatch(/^#1 mainly because of the lowest total cost \(\$40,000\)/);
    expect(first.reason).toMatch(/weak spot is its overall ranking \(#200\)/);
    expect(second.reason).toMatch(/^#2/);
  });

  it("ranks a single offer first without dividing by zero", () => {
    const [only1] = rankOffers([cheapLowRanked], DEFAULT_OFFER_WEIGHTS);
    expect(only1.position).toBe(1);
    expect(Number.isFinite(only1.score)).toBe(true);
  });
});

describe("summarizeOffers", () => {
  it("names the best overall, cheapest and highest-ranked offers", () => {
    const ranked = rankOffers(
      [
        offer({ id: "A", totalCost: 90000, overallRank: 30, matchScore: 95 }),
        offer({ id: "B", totalCost: 40000, overallRank: 120 }),
        offer({ id: "C", totalCost: 200000, overallRank: 3 }),
      ],
      only("match")
    );
    const summary = summarizeOffers(ranked);
    expect(summary.bestOverall?.id).toBe("A");
    expect(summary.cheapest?.id).toBe("B");
    expect(summary.highestRanked?.id).toBe("C");
  });

  it("handles no offers", () => {
    expect(summarizeOffers([])).toEqual({ bestOverall: null, cheapest: null, highestRanked: null });
  });
});
