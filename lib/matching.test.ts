import { describe, expect, it } from "vitest";
import {
  admissionChance,
  computeMatchScore,
  explainMatch,
  formatRank,
  getDisplayRanking,
} from "@/lib/matching";
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
    tuition: 40000,
    qs_ranking: 50,
    program_rankings: { "Computer Science": 10 },
    degree_levels: ["Undergraduate", "Masters", "PhD"],
    acceptance_rate: 100,
    avg_admitted_gpa: 90,
    sat_25: 1300,
    sat_75: 1500,
    min_ielts: 6.5,
    living_cost_per_year: 15000,
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
    ...overrides,
  };
}

function pointsFor(result: ReturnType<typeof computeMatchScore>, key: string) {
  return result.factors.find((f) => f.key === key)?.points;
}

describe("computeMatchScore", () => {
  it("gives a perfect match 100, a Safety label and no concerns", () => {
    const profile = makeProfile();
    const university = makeUniversity();

    const result = computeMatchScore(profile, university);
    const explanation = explainMatch(profile, university);

    expect(result.score).toBe(100);
    expect(result.eligible).toBe(true);
    expect(result.chance).toBe("Safety");
    expect(explanation.concerns).toEqual([]);
    expect(explanation.strengths.length).toBeGreaterThan(0);
  });

  it("treats a missing SAT and IELTS as unknown, not as a failure", () => {
    const profile = makeProfile({ sat_score: null, ielts_score: null });
    const university = makeUniversity();

    const result = computeMatchScore(profile, university);

    // English can't be judged at all; academic fit falls back to GPA only.
    expect(pointsFor(result, "english")).toBeNull();
    expect(pointsFor(result, "academic")).toBe(20);
    // Everything we *can* judge is perfect, so the rescaled score stays 100.
    expect(result.score).toBe(100);
  });

  it("scores a missing IELTS above one that's below the minimum", () => {
    const university = makeUniversity();
    const missing = computeMatchScore(makeProfile({ ielts_score: null }), university);
    const tooLow = computeMatchScore(makeProfile({ ielts_score: 5.5 }), university);

    expect(missing.score).toBeGreaterThan(tooLow.score);
  });

  it("mentions missing scores as concerns so the student knows to add them", () => {
    const { concerns } = explainMatch(
      makeProfile({ sat_score: null, ielts_score: null }),
      makeUniversity()
    );

    expect(concerns).toContain(
      "No SAT score on your profile yet — admitted students typically score 1300–1500."
    );
    expect(concerns.some((c) => c.startsWith("No IELTS score"))).toBe(true);
  });

  it("loses budget points in proportion to how far over budget a school is", () => {
    // 50% over the 60k budget → half of the 30 budget points.
    const university = makeUniversity({ tuition: 90000 });
    const result = computeMatchScore(makeProfile(), university);
    const { concerns } = explainMatch(makeProfile(), university);

    expect(pointsFor(result, "budget")).toBe(15);
    expect(result.score).toBeLessThan(100);
    expect(concerns).toContain("Tuition ($90,000/yr) is $30,000 over your budget.");
  });

  it("labels a very selective school as a Reach even for a strong student", () => {
    const result = computeMatchScore(makeProfile(), makeUniversity({ acceptance_rate: 5 }));
    expect(result.chance).toBe("Reach");
  });

  it("labels a school as a Reach when the student is well below its admit stats", () => {
    const profile = makeProfile({ gpa_percentage: 80, sat_score: 1200 });
    const university = makeUniversity({ avg_admitted_gpa: 95, acceptance_rate: 60 });

    const result = computeMatchScore(profile, university);
    const { concerns } = explainMatch(profile, university);

    expect(result.chance).toBe("Reach");
    expect(concerns).toContain(
      "Your GPA (80) is below the typical admitted average (95)."
    );
    expect(concerns).toContain("Your SAT (1200) is below the typical range (1300–1500).");
  });

  it("scores 0 when the school doesn't offer the student's degree level", () => {
    const profile = makeProfile({ preferred_degree_level: "Masters" });
    const university = makeUniversity({ degree_levels: ["Undergraduate"] });

    const result = computeMatchScore(profile, university);

    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
    expect(explainMatch(profile, university).concerns[0]).toMatch(/Doesn't offer Masters/);
  });

  it("doesn't rule out a school whose degree levels are unknown", () => {
    const result = computeMatchScore(makeProfile(), makeUniversity({ degree_levels: [] }));
    expect(result.eligible).toBe(true);
  });
});

describe("explainMatch extra notes", () => {
  it("flags tuition far below the student's minimum budget", () => {
    const { concerns } = explainMatch(
      makeProfile({ budget_min: 20000 }),
      makeUniversity({ tuition: 5000 })
    );
    expect(concerns.some((c) => c.includes("much cheaper than your range"))).toBe(true);
  });

  it("warns when tuition fits but tuition plus living costs doesn't", () => {
    const { strengths, concerns } = explainMatch(
      makeProfile({ budget_max: 60000 }),
      makeUniversity({ tuition: 50000, living_cost_per_year: 15000 })
    );
    expect(strengths.some((s) => s.startsWith("Tuition ($50,000/yr) fits"))).toBe(true);
    expect(concerns.some((c) => c.startsWith("With living costs"))).toBe(true);
  });
});

describe("admissionChance", () => {
  it("returns Match when academic fit is unknown, instead of guessing Safety", () => {
    expect(admissionChance(null, 90)).toBe("Match");
  });
});

describe("getDisplayRanking", () => {
  it("uses the subject ranking for the student's major when there is one", () => {
    expect(getDisplayRanking(makeUniversity(), makeProfile())).toEqual({
      rank: 10,
      label: "Computer Science",
    });
  });

  it("falls back to the overall ranking, labeled as such", () => {
    const profile = makeProfile({ intended_majors: ["Law"] });
    expect(getDisplayRanking(makeUniversity(), profile)).toEqual({
      rank: 50,
      label: "Overall",
    });
  });

  it("reports an unranked school as unranked instead of inventing a number", () => {
    const university = makeUniversity({ qs_ranking: null, program_rankings: {} });
    const ranking = getDisplayRanking(university, makeProfile());

    expect(ranking).toEqual({ rank: null, label: "Overall" });
    expect(formatRank(ranking.rank)).toBe("Ranking not available");
  });
});

describe("missing program data", () => {
  it("treats a school with no program list as unknown, not as a mismatch", () => {
    const university = makeUniversity({ popular_programs: [] });
    const result = computeMatchScore(makeProfile(), university);
    const { concerns } = explainMatch(makeProfile(), university);

    expect(result.factors.find((f) => f.key === "major")?.points).toBeNull();
    expect(result.score).toBe(100); // everything known is a perfect fit
    expect(concerns.some((c) => c.startsWith("None of your intended majors"))).toBe(false);
  });
});
