import { describe, expect, it } from "vitest";
import type { CountryInfo } from "@/lib/country-info";
import { fitWeights, scoreUniversity } from "@/lib/matching";
import { compareBest } from "@/lib/ranking";
import { VISA_WEIGHT_POINTS } from "@/lib/scoring-config";
import type { Profile, University } from "@/lib/types";

// How "Visa and work rights" changes (or doesn't change) the scores.

const profile = (fields: Partial<Profile> = {}): Profile => ({
  id: "s", full_name: "S", country: "India", intended_majors: ["Computer Science"], gpa_percentage: 88,
  ielts_score: 7, sat_score: null, budget_min: 0, budget_max: 45000, preferred_countries: [],
  preferred_degree_level: "Undergraduate", focuses: [], created_at: "", updated_at: "", ...fields,
});

const school = (name: string, country: string, fields: Partial<University> = {}) =>
  ({
    id: name, name, country, tuition: 30000, qs_ranking: null, program_rankings: {}, degree_levels: ["Undergraduate"],
    acceptance_rate: null, avg_admitted_gpa: null, sat_25: null, sat_75: null, min_ielts: 6.5, living_cost_per_year: 12000,
    popular_programs: ["Computer Science"], description: "", created_by: null, created_at: "", source: "curated",
    data_year: null, fetched_at: null, source_url: null, scorecard_id: null, city: null, state: null, ownership: null,
    us_region: null, tuition_in_state: null, avg_net_price: null, student_size: null, completion_rate: null,
    median_earnings_10yr: null, strength_index: 80, strength_tier: "B", strength_confidence: "Medium",
    strength_is_estimate: false, strength_position: 100, strength_signals: { signals: {}, of: 1688, computed_on: "" },
    ...fields,
  }) as University;

const info = (country: string, fields: Partial<CountryInfo>): CountryInfo => ({
  country, post_study_text: null, post_study_months: null, post_study_source_url: null, post_study_checked_on: null,
  funds_text: null, funds_amount: null, funds_currency: null, funds_period: null, funds_source_url: null, funds_checked_on: null,
  work_text: null, work_hours_per_week: null, work_source_url: null, work_checked_on: null, notes: null, ...fields,
});

const countryInfo = new Map([
  ["Canada", info("Canada", { post_study_months: 36, work_hours_per_week: 24 })],
  ["Switzerland", info("Switzerland", { post_study_months: 6, work_hours_per_week: 15 })],
  // £1,529/month ≈ $2,000 a month; $45k budget − $40k tuition leaves ~$417.
  ["United Kingdom", info("United Kingdom", { post_study_months: 18, funds_amount: 1529, funds_currency: "GBP", funds_period: "month" })],
]);
const schools = [
  school("Long window", "Canada"),
  school("Short window", "Switzerland"),
  school("Funds above budget", "United Kingdom", { tuition: 40000 }),
  school("No visa data", "Peru"),
];
const order = (p: Profile) =>
  schools.map((u) => scoreUniversity(p, u, { countryInfo })).sort(compareBest).map((e) => e.university.name);

describe("visa: ignore and show change nothing", () => {
  it("gives identical scores and order to having no visa setting at all", () => {
    for (const mode of [undefined, null, "ignore", "show"] as const) {
      const p = profile({ visa_mode: mode, visa_weight: "high", stay_after: "yes" });
      for (const u of schools) {
        const before = scoreUniversity(profile(), u);
        const after = scoreUniversity(p, u, { countryInfo });
        expect(after.match).toEqual(before.match);
        expect(after.rank).toEqual(before.rank);
      }
      expect(order(p)).toEqual(order(profile()));
    }
  });

  it("shows a visa line in show mode, and nothing when ignored", () => {
    expect(scoreUniversity(profile({ visa_mode: "show" }), schools[0], { countryInfo }).visa?.line).toBe("Visa: 3-year post-study work · 24 h/week work in study");
    expect(scoreUniversity(profile({ visa_mode: "ignore" }), schools[0], { countryInfo }).visa).toBeNull();
  });
});

describe("visa: factor it in", () => {
  const factor = profile({ visa_mode: "factor", visa_weight: "high", stay_after: "yes" });

  it("keeps the weights adding up to 100 at every slider position", () => {
    for (const visa_weight of ["low", "medium", "high"] as const) {
      const w = fitWeights({ ...factor, visa_weight });
      expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(100);
      expect(w.visa).toBe(VISA_WEIGHT_POINTS[visa_weight]);
    }
    expect(fitWeights(profile()).visa ?? 0).toBe(0);
  });

  it("moves a long post-study window up and funds above budget down", () => {
    // Identical schools except the country; without the visa the tie is
    // broken by name, so "A …" comes first.
    const pair = (a: University, b: University, p: Profile) =>
      [a, b].map((u) => scoreUniversity(p, u, { countryInfo })).sort(compareBest).map((e) => e.university.name);
    const shortA = school("A short window", "Switzerland");
    const longZ = school("Z long window", "Canada");
    expect(pair(shortA, longZ, profile())).toEqual(["A short window", "Z long window"]);
    expect(pair(shortA, longZ, factor)).toEqual(["Z long window", "A short window"]);

    const fundsA = school("A funds above budget", "United Kingdom", { tuition: 40000 });
    const noDataZ = school("Z no visa data", "Peru", { tuition: 40000 });
    expect(pair(fundsA, noDataZ, profile())).toEqual(["A funds above budget", "Z no visa data"]);
    expect(pair(fundsA, noDataZ, factor)).toEqual(["Z no visa data", "A funds above budget"]);

    const funds = scoreUniversity(factor, fundsA, { countryInfo });
    expect(funds.explanation.concerns.some((c) => c.startsWith("Required funds are above your budget"))).toBe(true);
    expect(funds.match.factors.find((f) => f.key === "visa")?.label).toBe("Visa and work rights");
  });

  it("doesn't bury a school with no visa data: the factor is left out, not zero", () => {
    const none = scoreUniversity(factor, schools[3], { countryInfo });
    expect(none.match.factors.find((f) => f.key === "visa")?.points).toBeNull();
    expect(none.rank.visaFactor).toBe(1);
    expect(none.visa?.line).toBe("Visa information not available");
  });

  it("never changes quality", () => {
    for (const u of schools) {
      expect(scoreUniversity(factor, u, { countryInfo }).rank.quality).toBe(scoreUniversity(profile(), u).rank.quality);
    }
  });

  it("drops the post-study part for a student returning home", () => {
    const home = scoreUniversity({ ...factor, stay_after: "no" }, schools[0], { countryInfo });
    expect(home.visa?.fit.parts.map((p) => p.key)).toEqual(["work"]);
    expect(home.visa?.fit.notes).toContain("You plan to return home, so the post-study work window isn't counted.");
  });
});
