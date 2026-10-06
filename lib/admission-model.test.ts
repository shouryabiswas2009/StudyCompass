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
  it("covers SAT submitted, SAT not submitted, and schools with no SAT range", () => {
    expect(fixtures.length).toBe(20);
    expect(fixtures.some((f) => f.profile.sat_score !== null)).toBe(true);
    expect(fixtures.some((f) => f.profile.sat_score === null && f.university.sat_25 !== null)).toBe(true);
    expect(fixtures.some((f) => f.university.sat_25 === null)).toBe(true);
  });

  it.each(fixtures.map((f, i) => [i, f] as const))("row %i matches scikit-learn", (_, fixture) => {
    const prediction = predictAdmission(
      fixture.profile as ModelProfile,
      fixture.university as ModelUniversity
    );
    expect(prediction.probability).toBeCloseTo(fixture.expected_probability, 9);
  });
});

describe("predictAdmission behaviour", () => {
  const university: ModelUniversity = { sat_25: 1300, sat_75: 1500, acceptance_rate: 40 };
  const profile: ModelProfile = { gpa_percentage: 90, sat_score: 1400 };

  it("gives a higher chance for a higher GPA, all else equal", () => {
    const lower = predictAdmission({ ...profile, gpa_percentage: 80 }, university);
    const higher = predictAdmission({ ...profile, gpa_percentage: 95 }, university);
    expect(higher.probability).toBeGreaterThan(lower.probability);
  });

  it("gives a higher chance for a higher SAT within the school's range", () => {
    const lower = predictAdmission({ ...profile, sat_score: 1300 }, university);
    const higher = predictAdmission({ ...profile, sat_score: 1500 }, university);
    expect(higher.probability).toBeGreaterThan(lower.probability);
  });

  it("gives a lower chance at a more selective school", () => {
    const easier = predictAdmission(profile, { ...university, acceptance_rate: 60 });
    const harder = predictAdmission(profile, { ...university, acceptance_rate: 10 });
    expect(harder.probability).toBeLessThan(easier.probability);
  });

  it("shows a strong GPA as a positive contribution and a weak one as negative", () => {
    const gpa = (p: ReturnType<typeof predictAdmission>) =>
      p.contributions.find((c) => c.label === "Your GPA")!.points;
    expect(gpa(predictAdmission({ ...profile, gpa_percentage: 99 }, university))).toBeGreaterThan(0);
    expect(gpa(predictAdmission({ ...profile, gpa_percentage: 70 }, university))).toBeLessThan(0);
  });

  it("marks SAT as 'no data' when the school publishes no SAT range", () => {
    const noRange = predictAdmission(profile, { ...university, sat_25: null, sat_75: null });
    expect(noRange.contributions.find((c) => c.label === "SAT")!.known).toBe(false);
    expect(admissionFeatures(profile, { ...university, sat_25: null, sat_75: null })[2]).toBe(0);
  });
});

describe("chanceFromProbability", () => {
  it("maps probabilities to Reach / Match / Safety", () => {
    expect(chanceFromProbability(0.1)).toBe("Reach");
    expect(chanceFromProbability(0.5)).toBe("Match");
    expect(chanceFromProbability(0.85)).toBe("Safety");
  });
});
