import { describe, expect, it } from "vitest";
import { computeMatchScore } from "@/lib/matching";
import { SAMPLE_PROFILE, exampleMatches, exampleWhatIf, landingStats } from "@/lib/landing";
import { applyWhatIf, compareWhatIf } from "@/lib/what-if";
import type { University } from "@/lib/types";

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

const shared = (overrides: Partial<University>) => makeUniversity({ is_featured: true, ...overrides });

describe("landingStats", () => {
  it("counts only shared schools, canonical countries and verified tuition", () => {
    const stats = landingStats([
      shared({ id: "a", country: "USA", source: "College Scorecard", tuition: 50000 }),
      shared({ id: "b", country: "United States", source: "College Scorecard", tuition: null }),
      shared({ id: "c", country: "UK", source: "curated", tuition: 30000 }),
      // A curated fee in a currency with no official rate: local amount only.
      shared({ id: "d", country: "Taiwan", source: "curated", tuition: null, tuition_local: 100920 }),
      shared({ id: "e", country: "Japan", source: "illustrative", tuition: 9000 }),
      shared({ id: "f", country: "France", source: "user-entered", tuition: 1000, created_by: "student-1" }),
    ]);
    expect(stats).toEqual({
      universities: 5,
      countries: 4, // United States, United Kingdom, Taiwan, Japan
      verifiedTuition: 3, // a, c, d (not the illustrative one, not unknown)
      officialUs: 2,
      checkedInternational: 2,
    });
  });

  it("is all zeros for an empty list", () => {
    expect(landingStats([])).toEqual({
      universities: 0, countries: 0, verifiedTuition: 0, officialUs: 0, checkedInternational: 0,
    });
  });
});

describe("exampleMatches", () => {
  it("uses only featured shared schools, one per country, best score first", () => {
    const list = [
      shared({ id: "ca1", name: "Canada One", country: "Canada" }),
      shared({ id: "ca2", name: "Canada Two", country: "Canada", tuition: 90000 }),
      shared({ id: "de", name: "German School", country: "Germany" }),
      shared({ id: "nl", name: "Dutch School", country: "Netherlands", qs_ranking: 50 }),
      shared({ id: "hidden", name: "Not Featured", country: "Spain", is_featured: false }),
      shared({ id: "mine", name: "Student Added", country: "Italy", created_by: "student-1" }),
    ];
    const picks = exampleMatches(list);
    expect(picks).toHaveLength(3);
    expect(picks.map((p) => p.university.id)).not.toContain("hidden");
    expect(picks.map((p) => p.university.id)).not.toContain("mine");
    expect(new Set(picks.map((p) => p.university.country)).size).toBe(3);
    // Scores come from the real scoring function with the sample profile.
    for (const p of picks) expect(p.score).toBe(computeMatchScore(SAMPLE_PROFILE, p.university).score);
    expect(picks[0].score).toBeGreaterThanOrEqual(picks[1].score);
  });

  it("breaks ties by ranking then name, so the row never shuffles", () => {
    const list = [
      shared({ id: "b", name: "B School", country: "Canada", qs_ranking: 20 }),
      shared({ id: "a", name: "A School", country: "United States", qs_ranking: 20 }),
      shared({ id: "top", name: "Top School", country: "Netherlands", qs_ranking: 1 }),
    ];
    expect(exampleMatches(list).map((p) => p.university.id)).toEqual(["top", "a", "b"]);
    expect(exampleMatches(list)).toEqual(exampleMatches([...list].reverse()));
  });
});

describe("exampleWhatIf", () => {
  const scorecard = (overrides: Partial<University>) =>
    shared({ source: "College Scorecard", acceptance_rate: 40, sat_25: 1250, sat_75: 1450, country: "United States", ...overrides });

  it("picks a featured Scorecard school with admission figures and raises the SAT by 100", () => {
    const result = exampleWhatIf([
      shared({ id: "curated", source: "curated", acceptance_rate: null }),
      scorecard({ id: "no-sat", sat_25: null, sat_75: null }),
      scorecard({ id: "us" }),
    ]);
    expect(result?.university.id).toBe("us");
    expect(result?.satFrom).toBe(SAMPLE_PROFILE.sat_score);
    expect(result?.satTo).toBe((SAMPLE_PROFILE.sat_score ?? 0) + 100);
    // Same numbers the real sliders would show.
    const direct = compareWhatIf(SAMPLE_PROFILE, result!.university, {
      gpa_percentage: SAMPLE_PROFILE.gpa_percentage,
      sat_score: result!.satTo,
      ielts_score: SAMPLE_PROFILE.ielts_score,
    });
    expect(result?.comparison).toEqual(direct);
    expect(applyWhatIf(SAMPLE_PROFILE, { gpa_percentage: 84, sat_score: result!.satTo, ielts_score: 6.5 }).sat_score).toBe(result!.satTo);
  });

  it("prefers the school where the higher SAT moves the estimate most", () => {
    const result = exampleWhatIf([
      // The sample's SAT is far above this range: +100 changes little.
      scorecard({ id: "easy", name: "Easy", sat_25: 900, sat_75: 1000, acceptance_rate: 90 }),
      // Here 1300 → 1400 moves the student into the range.
      scorecard({ id: "stretch", name: "Stretch", sat_25: 1350, sat_75: 1500, acceptance_rate: 30 }),
    ]);
    expect(result?.university.id).toBe("stretch");
    expect(result?.comparison.probabilityChange).toBeGreaterThan(0);
  });

  it("is null when no school qualifies", () => {
    expect(exampleWhatIf([shared({ source: "curated" })])).toBeNull();
  });
});
