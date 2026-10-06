import { describe, expect, it } from "vitest";
import { scoreUniversity } from "@/lib/matching";
import { applyWhatIf, compareWhatIf, signed, snapToStep, valuesFromProfile } from "@/lib/what-if";
import type { Profile, University } from "@/lib/types";

// A strong student and a school that suits them. Each test overrides only
// the fields it's about, so it's clear what's being tested.
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "student-1",
    full_name: "Test Student",
    country: "India",
    intended_majors: ["Computer Science"],
    gpa_percentage: 95,
    ielts_score: 7.5,
    sat_score: 1550,
    budget_min: 0,
    budget_max: 60000,
    preferred_countries: ["Canada"],
    preferred_degree_level: "Undergraduate",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeUniversity(overrides: Partial<University> = {}): University {
  return {
    id: "uni-1",
    name: "Test University",
    country: "Canada",
    // Top marks on every focus factor too (rank #1, R1, mandatory co-op,
    // tuition + living = half the 60k budget), so "perfect" really is 100.
    tuition: 20000,
    qs_ranking: 1,
    program_rankings: { "Computer Science": 1 },
    degree_levels: ["Undergraduate", "Masters", "PhD"],
    acceptance_rate: 100,
    avg_admitted_gpa: 90,
    sat_25: 1300,
    sat_75: 1500,
    min_ielts: 6.5,
    living_cost_per_year: 10000,
    popular_programs: ["Computer Science", "Business"],
    description: "",
    created_by: null,
    created_at: "",
    source: "illustrative",
    data_year: null,
    fetched_at: null,
    source_url: null,
    scorecard_id: null,
    city: null,
    state: null,
    ownership: null,
    us_region: null,
    tuition_in_state: null,
    avg_net_price: null,
    student_size: null,
    completion_rate: null,
    median_earnings_10yr: null,
    research_intensity: "very_high",
    coop_program: "mandatory",
    ...overrides,
  };
}

// A College Scorecard school with an admission rate, so the demo admission
// model applies (it only runs on official figures).
const scorecard = (overrides: Partial<University> = {}) =>
  makeUniversity({ source: "College Scorecard", acceptance_rate: 30, sat_25: 1350, sat_75: 1500, ...overrides });

describe("snapToStep", () => {
  it("keeps values inside the form's range and on its step", () => {
    expect(snapToStep("sat_score", 1347)).toBe(1350);
    expect(snapToStep("sat_score", 2000)).toBe(1600);
    expect(snapToStep("ielts_score", 6.3)).toBe(6.5);
    expect(snapToStep("ielts_score", -1)).toBe(0);
    expect(snapToStep("gpa_percentage", 87.6)).toBe(88);
  });
});

describe("applyWhatIf", () => {
  it("returns a changed copy and never touches the saved profile", () => {
    const profile = makeProfile();
    const copy = applyWhatIf(profile, { gpa_percentage: 70, sat_score: null, ielts_score: 6 });
    expect(copy).toMatchObject({ gpa_percentage: 70, sat_score: null, ielts_score: 6 });
    expect(profile).toMatchObject({ gpa_percentage: 95, sat_score: 1550, ielts_score: 7.5 });
  });
});

describe("compareWhatIf", () => {
  it("shows no change when the sliders match the profile", () => {
    const profile = makeProfile();
    const result = compareWhatIf(profile, scorecard(), valuesFromProfile(profile));
    expect(result.changed).toBe(false);
    expect(result.scoreChange).toBe(0);
    expect(result.probabilityChange).toBe(0);
    expect(result.whatIf).toEqual(result.actual);
  });

  it("gives the same result as scoring the changed profile directly", () => {
    const profile = makeProfile({ sat_score: 1300 });
    const values = { gpa_percentage: 80, sat_score: 1450, ielts_score: 7 };
    const result = compareWhatIf(profile, scorecard(), values);
    const direct = scoreUniversity(applyWhatIf(profile, values), scorecard());
    expect(result.whatIf.score).toBe(direct.match.score);
    expect(result.whatIf.chance).toBe(direct.match.chance);
    expect(result.whatIf.probability).toBe(direct.prediction?.probability);
  });

  it("a higher SAT raises the score and the admission estimate", () => {
    const profile = makeProfile({ sat_score: 1200, gpa_percentage: 85 });
    const result = compareWhatIf(profile, scorecard(), { ...valuesFromProfile(profile), sat_score: 1550 });
    expect(result.changed).toBe(true);
    expect(result.scoreChange).toBeGreaterThan(0);
    expect(result.probabilityChange).toBeGreaterThan(0);
    expect(result.whatIf.probability!).toBeGreaterThan(result.actual.probability!);
  });

  it("a lower GPA lowers the score", () => {
    const profile = makeProfile();
    const result = compareWhatIf(profile, scorecard(), { ...valuesFromProfile(profile), gpa_percentage: 60 });
    expect(result.scoreChange).toBeLessThan(0);
  });

  it("an IELTS below the school's minimum lowers the score", () => {
    const profile = makeProfile();
    const result = compareWhatIf(profile, scorecard(), { ...valuesFromProfile(profile), ielts_score: 5 });
    expect(result.scoreChange).toBeLessThan(0);
  });

  it("has no admission estimate where the model doesn't apply (non-Scorecard school)", () => {
    const profile = makeProfile();
    const result = compareWhatIf(profile, makeUniversity(), { ...valuesFromProfile(profile), sat_score: 1300 });
    expect(result.actual.probability).toBeNull();
    expect(result.whatIf.probability).toBeNull();
    expect(result.probabilityChange).toBeNull();
  });
});

describe("signed", () => {
  it("formats changes with a sign", () => {
    expect(signed(5)).toBe("+5");
    expect(signed(-3)).toBe("−3");
    expect(signed(0)).toBe("±0");
  });
});
