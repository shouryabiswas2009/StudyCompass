import { describe, expect, it } from "vitest";
import { computeStrength, percentileMap, quantile, spearman, tierFor, verifiedRankPercentile, weightedIndex, type StrengthSchool } from "@/lib/strength";

const us = (key: string, f: Partial<StrengthSchool>): StrengthSchool => ({ key, name: key, country: "United States", peerType: "non_doctoral", ...f });

// A spread of US schools so percentiles mean something.
function population(): StrengthSchool[] {
  const schools: StrengthSchool[] = [];
  for (let i = 0; i < 40; i++) {
    schools.push(us(`college-${i}`, { graduation: 30 + i, retention: 55 + i, earnings: 30000 + i * 1000, sat: 900 + i * 10, carnegie: "non_doctoral" }));
  }
  return schools;
}

describe("percentiles and helpers", () => {
  it("ranks values with ties counting half", () => {
    const p = percentileMap([1, 2, 2, 4]);
    expect([p.get(1), p.get(2), p.get(4)]).toEqual([0, 50, 100]);
  });
  it("interpolates quantiles", () => {
    expect(quantile([10, 20, 30, 40, 50], 0.25)).toBe(20);
    expect(quantile([10, 20], 0.5)).toBe(15);
  });
  it("puts a verified rank on a log scale", () => {
    expect(verifiedRankPercentile(1)).toBe(100);
    expect(verifiedRankPercentile(2000)).toBe(0);
    expect(verifiedRankPercentile(45)).toBeCloseTo(49.9, 0);
  });
  it("cuts tiers at 90 / 70 / 40 / 15", () => {
    expect(["A", "B", "C", "D", "E"]).toEqual([95, 75, 50, 20, 5].map(tierFor));
    expect(tierFor(90)).toBe("A");
  });
  it("weights only the signals present", () => {
    expect(weightedIndex({ graduation: { percentile: 80 }, carnegie: { percentile: 20 } })).toBeCloseTo((25 * 80 + 5 * 20) / 30);
    expect(weightedIndex({})).toBeNull();
  });
  it("computes Spearman correlation", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1);
  });
});

describe("computeStrength: sanity profiles", () => {
  const strongResearch = us("research-university", {
    peerType: "very_high", graduation: 96, retention: 98, earnings: 110000, sat: 1530, carnegie: "very_high", leiden: 99,
    openalex: { works_count: 300000, cited_by_count: 2e7, h_index: 1500, i10_index: 100000, mean_citedness_2yr: 6 },
  });
  const teachingCollege = us("teaching-college", { graduation: 93, retention: 96, earnings: 85000, sat: 1480, carnegie: "non_doctoral",
    openalex: { works_count: 900, cited_by_count: 20000, h_index: 60, i10_index: 500, mean_citedness_2yr: 1.5 } });
  const weakCollege = us("weak-college", { graduation: 25, retention: 50, earnings: 28000, sat: 880, carnegie: "non_doctoral" });
  const all = [...population(), strongResearch, teachingCollege, weakCollege];
  const result = new Map(computeStrength(all).map((r) => [r.key, r]));

  it("puts a strong research university in tier A with high confidence", () => {
    expect(result.get("research-university")).toMatchObject({ tier: "A", confidence: "High", isEstimate: false, position: 1 });
  });

  it("keeps a strong teaching college well above weak colleges despite little research", () => {
    const teaching = result.get("teaching-college")!;
    expect(["A", "B"]).toContain(teaching.tier);
    expect(teaching.index).toBeGreaterThan(result.get("weak-college")!.index + 40);
    expect(result.get("weak-college")!.tier).toBe("E");
  });

  it("leaves OpenAlex out for schools with too few works", () => {
    const tiny = computeStrength([...all, us("tiny", { graduation: 50, retention: 70, openalex: { works_count: 40, cited_by_count: 900, h_index: 15, i10_index: 20, mean_citedness_2yr: 9 } })]);
    expect(tiny.find((r) => r.key === "tiny")!.signals.openalex).toBeUndefined();
  });
});

describe("computeStrength: missing signals and estimates", () => {
  it("measures a non-US university from research impact alone, with medium confidence", () => {
    const r = computeStrength([...population(), { key: "abroad", name: "abroad", country: "Japan", peerType: "university", leiden: 80 }]);
    expect(r.find((x) => x.key === "abroad")).toMatchObject({ isEstimate: false, confidence: "Medium", index: 80 });
  });

  it("estimates a school with no signals from its peers, as a range with low confidence", () => {
    const schools = [...population(), us("unknown", { peerType: "non_doctoral" })];
    const r = computeStrength(schools).find((x) => x.key === "unknown")!;
    const peers = computeStrength(population()).map((x) => x.index);
    expect(r.isEstimate).toBe(true);
    expect(r.confidence).toBe("Low");
    expect(r.peerGroup).toBe("United States, non_doctoral");
    expect(r.peerCount).toBe(40);
    expect(r.index).toBeCloseTo(peers.reduce((a, b) => a + b, 0) / peers.length, 0);
    expect(r.low!).toBeLessThan(r.index);
    expect(r.high!).toBeGreaterThan(r.index);
    expect(r.positionRange![0]).toBeLessThan(r.positionRange![1]);
  });

  it("treats one thin signal as not enough, and falls back to wider peer groups", () => {
    const r = computeStrength([...population(), { key: "lonely", name: "lonely", country: "Peru", peerType: "university", graduation: 70 }]);
    const lonely = r.find((x) => x.key === "lonely")!;
    expect(lonely.isEstimate).toBe(true);
    expect(lonely.peerGroup).toBe("all schools"); // no Peruvian or "university" peers measured
    expect(lonely.signals.graduation).toBeDefined(); // still listed, just not enough alone
  });

  it("gives every school an index and a position in the same list", () => {
    const r = computeStrength([...population(), us("unknown", {})]);
    expect(r.every((x) => typeof x.index === "number" && x.of === 41)).toBe(true);
  });
});
