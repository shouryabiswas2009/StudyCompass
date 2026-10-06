import { describe, expect, it } from "vitest";
import { validateUniversityForm } from "@/lib/university-validation";

function makeForm(overrides: Record<string, string | string[] | null> = {}): FormData {
  const fields: Record<string, string | string[] | null> = {
    name: "Local College",
    country: "India",
    tuition: "2000",
    qs_ranking: "",
    acceptance_rate: "80",
    avg_admitted_gpa: "",
    sat_25: "",
    sat_75: "",
    min_ielts: "",
    living_cost_per_year: "",
    popular_programs: ["Computer Science"],
    degree_levels: ["Undergraduate"],
    description: "",
    ...overrides,
  };

  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value === null) continue;
    for (const v of Array.isArray(value) ? value : [value]) formData.append(name, v);
  }
  return formData;
}

describe("validateUniversityForm", () => {
  it("accepts a minimal unranked school and leaves unknown stats null", () => {
    const result = validateUniversityForm(makeForm());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.qs_ranking).toBeNull();
      expect(result.data.sat_25).toBeNull();
      expect(result.data.min_ielts).toBeNull();
      expect(result.data.degree_levels).toEqual(["Undergraduate"]);
    }
  });

  it("requires both ends of an SAT range", () => {
    const result = validateUniversityForm(makeForm({ sat_25: "1200" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.sat_25).toMatch(/both ends/);
  });

  it("rejects an SAT range that's the wrong way round", () => {
    const result = validateUniversityForm(makeForm({ sat_25: "1400", sat_75: "1300" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.sat_25).toMatch(/can't be higher/);
  });

  it.each([
    ["acceptance_rate", "120", /0 to 100/],
    ["qs_ranking", "0", /1 or more/],
    ["qs_ranking", "12.5", /whole number/],
    ["min_ielts", "6.3", /steps of 0.5/],
    ["tuition", "-5", /0 or more/],
  ])("rejects %s = %s", (field, value, message) => {
    const result = validateUniversityForm(makeForm({ [field]: value }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[field as keyof typeof result.errors]).toMatch(message);
    }
  });

  it("requires a program and a valid degree level", () => {
    const result = validateUniversityForm(
      makeForm({ popular_programs: null, degree_levels: ["Diploma"] })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.popular_programs).toBeDefined();
      expect(result.errors.degree_levels).toBeDefined();
    }
  });
});
