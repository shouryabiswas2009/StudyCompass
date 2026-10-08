import { describe, expect, it } from "vitest";
import { describePeerGroup, hasVerifiedRanking, strengthForStudent, strengthSummary } from "@/lib/strength-display";
import type { UniversitySummary } from "@/lib/types";

const measured = {
  strength_index: 80,
  strength_low: null,
  strength_high: null,
  strength_tier: "B",
  strength_confidence: "High",
  strength_is_estimate: false,
  strength_position: 212,
  strength_signals: {
    signals: { graduation: { value: 90, percentile: 80 }, leiden: { value: 80, percentile: 80 } },
    of: 1688,
    computed_on: "2026-10-07",
  },
  research_impact: { fields: { math_cs: 40 } },
} as unknown as UniversitySummary;

const estimate = {
  strength_index: 52.3,
  strength_low: 41.2,
  strength_high: 63.9,
  strength_tier: "C",
  strength_confidence: "Low",
  strength_is_estimate: true,
  strength_position: 700,
  strength_signals: { signals: {}, of: 1688, computed_on: "2026-10-07", peer_group: "United States, non_doctoral", peer_count: 800, position_range: [420, 1010] },
} as unknown as UniversitySummary;

describe("strengthSummary", () => {
  it("shows a measured index as a number with its position", () => {
    expect(strengthSummary(measured)).toEqual({ tier: "B", value: "80", position: "#212 of 1,688", confidence: "High", isEstimate: false });
  });
  it("shows an estimate only as a range, never a precise number", () => {
    expect(strengthSummary(estimate)).toEqual({ tier: "C", value: "est. 41–64", position: "about #420–#1,010 of 1,688", confidence: "Low", isEstimate: true });
  });
  it("is null without an index", () => {
    expect(strengthSummary({} as UniversitySummary)).toBeNull();
  });
});

describe("strengthForStudent", () => {
  it("uses research impact in the student's field, with the same weights", () => {
    // graduation 25 × 80 + leiden 15 × 40 (math/CS instead of 80) = 2600 / 40 = 65
    expect(strengthForStudent({ intended_majors: ["Computer Science"] }, measured)).toBe(65);
  });
  it("keeps the stored index otherwise", () => {
    expect(strengthForStudent({ intended_majors: ["History"] }, measured)).toBe(80);
    expect(strengthForStudent(null, measured)).toBe(80);
    expect(strengthForStudent({ intended_majors: ["Computer Science"] }, estimate)).toBe(52.3);
    expect(strengthForStudent(null, {} as UniversitySummary)).toBeNull();
  });
});

describe("hasVerifiedRanking", () => {
  it("ignores rankings on College Scorecard rows (illustrative leftovers)", () => {
    expect(hasVerifiedRanking({ source: "College Scorecard", qs_ranking: 1, program_rankings: {} } as unknown as UniversitySummary)).toBe(false);
    expect(hasVerifiedRanking({ source: "curated", qs_ranking: 30, program_rankings: {} } as unknown as UniversitySummary)).toBe(true);
    expect(hasVerifiedRanking({ source: "user-entered", qs_ranking: null, program_rankings: {} } as unknown as UniversitySummary)).toBe(false);
  });
});

describe("describePeerGroup", () => {
  it("turns the stored codes into words", () => {
    expect(describePeerGroup("United States, non_doctoral")).toBe("United States: colleges without doctoral programs");
    expect(describePeerGroup("university")).toBe("universities outside the US");
    expect(describePeerGroup("all schools")).toBe("all schools in our list");
    expect(describePeerGroup(undefined)).toBe("similar schools");
  });
});
