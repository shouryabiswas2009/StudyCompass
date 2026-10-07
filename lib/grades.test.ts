import { describe, expect, it } from "vitest";
import { CAMBRIDGE_A_LEVEL_MARKS, GRADE_SYSTEMS, GRADE_SYSTEM_INFO, IB_RANGES, describeGrades, gradeToPercentage } from "@/lib/grades";

const pct = (system: Parameters<typeof gradeToPercentage>[0], input: string) => {
  const r = gradeToPercentage(system, input);
  return r.ok ? [r.percentage, r.basis] : r.error;
};

describe("percentage (CBSE XII, ISC, state boards)", () => {
  it("keeps the number as it is", () => {
    expect(pct("percentage", "88")).toEqual([88, "exact"]);
    expect(pct("percentage", " 91.25 ")).toEqual([91.3, "exact"]);
  });
  it("rejects values outside 0-100", () => {
    expect(pct("percentage", "101")).toMatch(/0 to 100/);
    expect(pct("percentage", "abc")).toMatch(/0 to 100/);
    expect(pct("percentage", "")).toMatch(/Enter your grades/);
  });
});

describe("CBSE Class X CGPA (CBSE Circular 24/2010: 9.5 × CGPA)", () => {
  it("multiplies by 9.5", () => {
    expect(pct("cbse_cgpa", "10")).toEqual([95, "converted"]);
    expect(pct("cbse_cgpa", "9.4")).toEqual([89.3, "converted"]);
    expect(pct("cbse_cgpa", "8")).toEqual([76, "converted"]);
  });
  it("rejects a CGPA outside 0-10", () => {
    expect(pct("cbse_cgpa", "10.2")).toMatch(/0 to 10/);
  });
});

describe("IB subject grades (IB's suggested ranges for Indian universities, midpoints)", () => {
  it("uses the middle of each published range", () => {
    expect(IB_RANGES[7]).toEqual([96, 100]);
    expect(pct("ib", "7")).toEqual([98, "converted"]);
    expect(pct("ib", "6")).toEqual([89, "converted"]);
    expect(pct("ib", "5")).toEqual([76, "converted"]);
    expect(pct("ib", "4")).toEqual([62.5, "converted"]);
    expect(pct("ib", "3")).toEqual([48, "converted"]);
    expect(pct("ib", "2")).toEqual([30.5, "converted"]);
    expect(pct("ib", "1")).toEqual([10.5, "converted"]);
  });
  it("averages the subjects", () => {
    // (98 + 89 + 89 + 76 + 89 + 98) / 6 = 89.83…
    expect(pct("ib", "7, 6, 6, 5, 6, 7")).toEqual([89.8, "converted"]);
    expect(pct("ib", "7 7 7")).toEqual([98, "converted"]);
  });
  it("rejects grades outside 1-7", () => {
    expect(pct("ib", "8, 6")).toMatch(/from 1 to 7/);
    expect(pct("ib", "6.5")).toMatch(/from 1 to 7/);
  });
});

describe("Cambridge International A Levels (PUM range midpoints)", () => {
  it("matches Cambridge's own worked example", () => {
    // Appendix 1: A* = 95, A = 85, B = 75, overall 85 (255 / 3).
    expect(pct("cambridge_a_level", "A*, A, B")).toEqual([85, "converted"]);
  });
  it("covers every A Level grade and ignores letter case", () => {
    expect(Object.keys(CAMBRIDGE_A_LEVEL_MARKS)).toEqual(["A*", "A", "B", "C", "D", "E"]);
    expect(pct("cambridge_a_level", "c d e")).toEqual([55, "converted"]);
    expect(pct("cambridge_a_level", "a*")).toEqual([95, "converted"]);
  });
  it("rejects unknown grades", () => {
    expect(pct("cambridge_a_level", "A, F")).toMatch(/A\*, A, B, C, D or E/);
  });
});

describe("systems without a published table", () => {
  it("takes the student's nearest percentage and marks it approximate", () => {
    expect(pct("us_gpa", "90")).toEqual([90, "approximate"]);
    expect(pct("other", "72.5")).toEqual([72.5, "approximate"]);
  });
});

describe("every system", () => {
  it("has a label, help and, if it converts, a cited source", () => {
    for (const s of GRADE_SYSTEMS) {
      const info = GRADE_SYSTEM_INFO[s];
      expect(info.label && info.help && info.inputLabel).toBeTruthy();
      if (info.basis === "converted") expect(info.source?.url).toMatch(/^https:\/\//);
    }
  });

  it("describes the result", () => {
    expect(describeGrades(88, "percentage", "exact")).toBe("88%");
    expect(describeGrades(89.8, "ib", "converted")).toBe("89.8% (converted from your IB Diploma subject grades)");
    expect(describeGrades(90, "us_gpa", "approximate")).toBe("90% (approximate, your estimate)");
    expect(describeGrades(90, undefined, undefined)).toBe("90%");
  });
});
