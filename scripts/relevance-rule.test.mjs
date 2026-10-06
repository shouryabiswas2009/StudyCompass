import { describe, expect, it } from "vitest";
import { RELEVANCE_RULE, featuredSql, isFeatured } from "./relevance-rule.mjs";

const scorecard = (overrides) => ({
  source: "College Scorecard",
  scorecard_id: 1,
  research_intensity: "non_doctoral",
  sat_75: null,
  qs_ranking: null,
  ...overrides,
});

describe("isFeatured", () => {
  it("features R1/R2 research universities", () => {
    expect(isFeatured(scorecard({ research_intensity: "very_high" }))).toBe(true);
    expect(isFeatured(scorecard({ research_intensity: "high" }))).toBe(true);
    expect(isFeatured(scorecard({ research_intensity: "doctoral_professional" }))).toBe(false);
  });

  it("features selective schools at or above the SAT threshold only", () => {
    expect(isFeatured(scorecard({ sat_75: RELEVANCE_RULE.minSat75 }))).toBe(true);
    expect(isFeatured(scorecard({ sat_75: RELEVANCE_RULE.minSat75 - 10 }))).toBe(false);
  });

  it("features ranked and hand-curated schools", () => {
    expect(isFeatured(scorecard({ qs_ranking: 250 }))).toBe(true);
    expect(isFeatured(scorecard({ scorecard_id: 42 }), [42])).toBe(true);
  });

  it("doesn't feature a small open-admission college with none of these", () => {
    expect(isFeatured(scorecard({ sat_75: null, research_intensity: null }))).toBe(false);
  });

  it("always features hand-picked non-Scorecard schools", () => {
    expect(isFeatured({ source: "illustrative" })).toBe(true);
    expect(isFeatured({ source: "curated" })).toBe(true);
  });
});

describe("featuredSql", () => {
  it("uses the thresholds from the one constants object", () => {
    const sql = featuredSql([166683]);
    expect(sql).toContain(`>= ${RELEVANCE_RULE.minSat75}`);
    expect(sql).toContain("'very_high', 'high'");
    expect(sql).toContain("array[166683]");
    expect(sql).toContain("where created_by is null"); // students' own rows untouched
  });
});
