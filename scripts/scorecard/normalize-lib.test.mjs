import { describe, expect, it } from "vitest";
import {
  degreeLevels,
  detectDataYear,
  livingCost,
  normalizeSchool,
  researchIntensity,
  satRange,
  topPrograms,
} from "./normalize-lib.mjs";

// Shaped like a real keys_nested API record (values from Purdue's record).
function rawSchool(overrides = {}) {
  return {
    id: 243780,
    school: {
      name: "Purdue University-Main Campus",
      city: "West Lafayette",
      state: "IN",
      ownership: 1,
      region_id: 3,
      degrees_awarded: { highest: 4 },
      carnegie_basic: 15,
    },
    latest: {
      admissions: {
        admission_rate: { overall: 0.4987 },
        sat_scores: {
          "25th_percentile": { critical_reading: 600, math: 600 },
          "75th_percentile": { critical_reading: 720, math: 760 },
          midpoint: { critical_reading: 640, math: 670 },
        },
      },
      cost: {
        tuition: { in_state: 9992, out_of_state: 28794 },
        avg_net_price: { public: 14600, private: null },
        roomboard: { oncampus: 12820 },
        otherexpense: { oncampus: 2290 },
      },
      student: { size: 44503, retention_rate: { four_year: { full_time: 0.927 } } },
      completion: { completion_rate_4yr_150nt: 0.831 },
      earnings: { "10_yrs_after_entry": { median: 72424 } },
      academics: { program_percentage: { engineering: 0.25, computer: 0.12, business_marketing: 0.1, health: 0.08, history: 0.01 } },
    },
    ...overrides,
  };
}

const meta = { dataYear: "2024", fetchedAt: "2026-10-06T00:00:00.000Z" };

describe("normalizeSchool", () => {
  it("maps official fields and records where they came from", () => {
    const row = normalizeSchool(rawSchool(), meta);
    expect(row).toMatchObject({
      scorecard_id: 243780,
      country: "United States",
      ownership: "public",
      us_region: "Great Lakes",
      tuition: 28794, // out-of-state: what an international student pays
      tuition_in_state: 9992,
      acceptance_rate: 49.9,
      sat_25: 1200,
      sat_75: 1480,
      sat_midpoint: 1310,
      living_cost_per_year: 15110,
      completion_rate: 83.1,
      retention_rate: 92.7,
      research_intensity: "very_high",
      source: "College Scorecard",
      data_year: "2024",
      source_url: "https://collegescorecard.ed.gov/school/?243780",
    });
  });

  it("never invents a GPA or English-test minimum", () => {
    const row = normalizeSchool(rawSchool(), meta);
    expect(row.avg_admitted_gpa).toBeNull();
    expect(row.min_ielts).toBeNull();
  });

  it("skips a school with no tuition at all", () => {
    const raw = rawSchool();
    raw.latest.cost.tuition = { in_state: null, out_of_state: null };
    expect(normalizeSchool(raw, meta)).toBeNull();
  });
});

describe("researchIntensity", () => {
  it("maps the three doctoral Carnegie codes and labels the rest non-doctoral", () => {
    expect(researchIntensity(15)).toBe("very_high");
    expect(researchIntensity(16)).toBe("high");
    expect(researchIntensity(17)).toBe("doctoral_professional");
    expect(researchIntensity(21)).toBe("non_doctoral"); // e.g. a liberal arts college
  });

  it("leaves unclassified schools unknown", () => {
    expect(researchIntensity(-2)).toBeNull();
    expect(researchIntensity(0)).toBeNull();
    expect(researchIntensity(undefined)).toBeNull();
  });
});

describe("satRange", () => {
  it("is null unless all four section percentiles exist (test-optional schools)", () => {
    expect(satRange({ "25th_percentile": { critical_reading: 600, math: null } })).toEqual({
      sat_25: null,
      sat_75: null,
    });
  });
});

describe("topPrograms", () => {
  it("returns the biggest fields as app major names, skipping tiny ones", () => {
    expect(topPrograms({ engineering: 0.25, computer: 0.12, history: 0.01 })).toEqual([
      "Engineering",
      "Computer Science",
    ]);
  });

  it("handles missing program data", () => {
    expect(topPrograms(null)).toEqual([]);
  });
});

describe("degreeLevels", () => {
  const programs = (...levels) => levels.map((level) => ({ credential: { level } }));

  it("reads the levels from the programs a school reports", () => {
    // MIT-like: bachelor's, master's and doctoral programs.
    expect(degreeLevels(4, programs(3, 5, 6, 5))).toEqual(["Undergraduate", "Masters", "PhD"]);
    // Williams-like: bachelor's plus two master's programs, no doctorates.
    expect(degreeLevels(4, programs(3, 3, 5))).toEqual(["Undergraduate", "Masters"]);
  });

  it("ignores certificates and other levels the app doesn't offer", () => {
    expect(degreeLevels(4, programs(1, 2, 3, 8))).toEqual(["Undergraduate"]);
  });

  it("only claims what Scorecard says when no programs are reported", () => {
    expect(degreeLevels(3, [])).toEqual(["Undergraduate"]);
    expect(degreeLevels(4, undefined)).toEqual([]); // "graduate" — Masters? PhD? unknown
  });
});

describe("livingCost", () => {
  it("only adds up when both parts are known", () => {
    expect(livingCost(12820, 2290)).toBe(15110);
    expect(livingCost(12820, null)).toBeNull();
  });
});

describe("detectDataYear", () => {
  it("finds the newest year whose value matches latest", () => {
    const record = {
      latest: { admissions: { admission_rate: { overall: 0.4987 } } },
      2025: { admissions: { admission_rate: { overall: null } } },
      2024: { admissions: { admission_rate: { overall: 0.4987 } } },
      2023: { admissions: { admission_rate: { overall: 0.503 } } },
    };
    expect(detectDataYear(record, "admissions.admission_rate.overall", [2023, 2024, 2025])).toBe("2024");
  });
});
