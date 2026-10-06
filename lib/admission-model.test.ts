import { describe, expect, it } from "vitest";
import fixtures from "@/lib/model/parity-fixtures.json";
import {
  admissionFeatures,
  chanceFromProbability,
  predictAdmission,
  type ModelProfile,
  type ModelUniversity,
} from "@/lib/admission-model";

// Rows exported by ml/train_admission.py together with the probability
// scikit-learn gave them. If TypeScript and Python ever compute features or
// predictions differently, these fail.
describe("TypeScript vs Python parity", () => {
  it("covers missing SAT, non-US schools and missing IELTS", () => {
    expect(fixtures.length).toBe(20);
    expect(fixtures.some((f) => f.profile.sat_score === null && f.university.sat_25 !== null)).toBe(true);
    expect(fixtures.some((f) => f.university.sat_25 === null)).toBe(true);
    expect(fixtures.some((f) => f.profile.ielts_score === null)).toBe(true);
  });

  it.each(fixtures.map((f, i) => [i, f] as const))("row %i matches scikit-learn", (_, fixture) => {
    const prediction = predictAdmission(
      fixture.profile as ModelProfile,
      fixture.university as ModelUniversity
    );
    expect(prediction).not.toBeNull();
    expect(prediction!.probability).toBeCloseTo(fixture.expected_probability, 9);
  });
});

describe("predictAdmission behaviour", () => {
  const university: ModelUniversity = {
    avg_admitted_gpa: 90,
    sat_25: 1300,
    sat_75: 1500,
    min_ielts: 6.5,
    acceptance_rate: 40,
  };
  const profile: ModelProfile = { gpa_percentage: 90, sat_score: 1400, ielts_score: 7 };

  it("gives a higher chance for a higher GPA, all else equal", () => {
    const lower = predictAdmission({ ...profile, gpa_percentage: 85 }, university)!;
    const higher = predictAdmission({ ...profile, gpa_percentage: 95 }, university)!;
    expect(higher.probability).toBeGreaterThan(lower.probability);
  });

  it("gives a lower chance at a more selective school", () => {
    const easier = predictAdmission(profile, { ...university, acceptance_rate: 60 })!;
    const harder = predictAdmission(profile, { ...university, acceptance_rate: 10 })!;
    expect(harder.probability).toBeLessThan(easier.probability);
  });

  it("shows a strong GPA as a positive contribution and a weak one as negative", () => {
    const strong = predictAdmission({ ...profile, gpa_percentage: 99 }, university)!;
    const weak = predictAdmission({ ...profile, gpa_percentage: 75 }, university)!;
    const gpa = (p: typeof strong) => p.contributions.find((c) => c.label.startsWith("GPA"))!.points;
    expect(gpa(strong)).toBeGreaterThan(0);
    expect(gpa(weak)).toBeLessThan(0);
  });

  it("returns null when the school has no admitted-GPA figure", () => {
    expect(predictAdmission(profile, { ...university, avg_admitted_gpa: null })).toBeNull();
    expect(admissionFeatures(profile, { ...university, avg_admitted_gpa: null })).toBeNull();
  });
});

describe("chanceFromProbability", () => {
  it("maps probabilities to Reach / Match / Safety", () => {
    expect(chanceFromProbability(0.1)).toBe("Reach");
    expect(chanceFromProbability(0.5)).toBe("Match");
    expect(chanceFromProbability(0.85)).toBe("Safety");
  });
});
