import { describe, expect, it } from "vitest";
import { describeImpact, majorField, ordinal, researchImpactFor } from "@/lib/research-impact";
import type { ResearchImpact, UniversitySummary } from "@/lib/types";

const impact: ResearchImpact = {
  overall: 88,
  pp_top10: 0.127,
  publications: 6672,
  fields: { biomedical: 81, math_cs: 71, physical_eng: 91 },
  ror: "019wvm592",
  source: "CWTS Leiden Ranking Open Edition 2025",
  source_url: "https://doi.org/10.5281/zenodo.17473224",
  data_year: "2020–2023",
  licence: "CC0 1.0",
  checked_on: "2026-10-07",
};
const school = (research_impact: ResearchImpact | null) => ({ research_impact }) as UniversitySummary;

describe("majorField", () => {
  it("files majors the way Leiden files their topics", () => {
    expect(majorField("Computer Science")).toBe("math_cs");
    expect(majorField("Data Science")).toBe("math_cs");
    expect(majorField("Computer Engineering")).toBe("math_cs"); // Leiden: computer engineering is math/CS
    expect(majorField("Biomedical Engineering")).toBe("biomedical");
    expect(majorField("Mechanical Engineering")).toBe("physical_eng");
    expect(majorField("Environmental Engineering")).toBe("life_earth");
    expect(majorField("Medicine")).toBe("biomedical");
    expect(majorField("Economics")).toBe("social_humanities");
    expect(majorField("Law")).toBe("social_humanities");
  });

  it("leaves majors that span several fields to the overall figure", () => {
    expect(majorField("Biological Sciences")).toBeNull();
    expect(majorField("Psychology")).toBeNull();
    expect(majorField("Architecture")).toBeNull();
    expect(majorField("  ")).toBeNull();
  });
});

describe("researchImpactFor", () => {
  it("uses the first major that has a field figure", () => {
    expect(researchImpactFor({ intended_majors: ["Psychology", "Physics"] }, school(impact))).toEqual({ percentile: 91, field: "physical_eng" });
  });

  it("falls back to the overall figure", () => {
    expect(researchImpactFor({ intended_majors: ["Economics"] }, school(impact))).toEqual({ percentile: 88, field: null });
    expect(researchImpactFor(null, school(impact))).toEqual({ percentile: 88, field: null });
  });

  it("is null for a school outside the ranking (or before the migration)", () => {
    expect(researchImpactFor(null, school(null))).toBeNull();
    expect(researchImpactFor(null, {} as UniversitySummary)).toBeNull();
  });
});

describe("describeImpact", () => {
  it("writes ordinals correctly", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 88, 100].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "88th", "100th"]);
    expect(describeImpact({ percentile: 71, field: "math_cs" })).toBe("71st percentile in mathematics and computer science");
    expect(describeImpact({ percentile: 88, field: null })).toBe("88th percentile");
  });
});
