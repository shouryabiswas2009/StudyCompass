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

  it("accepts an optional https source link and rejects other kinds", () => {
    const ok = validateUniversityForm(makeForm({ source_url: "https://www.example.ac.in/admissions" }));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.source_url).toBe("https://www.example.ac.in/admissions");

    const blank = validateUniversityForm(makeForm({ source_url: "" }));
    expect(blank.ok && blank.data.source_url).toBeNull();

    for (const bad of ["javascript:alert(1)", "not a link"]) {
      const result = validateUniversityForm(makeForm({ source_url: bad }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.source_url).toMatch(/https:\/\//);
    }
  });

  it("stores 'Not sure' research and co-op answers as unknown, never as 'no'", () => {
    const blank = validateUniversityForm(makeForm({ research_intensity: "", coop_program: "" }));
    expect(blank.ok && blank.data.research_intensity).toBeNull();
    expect(blank.ok && blank.data.coop_program).toBe("unknown");

    const set = validateUniversityForm(
      makeForm({ research_intensity: "high", coop_program: "mandatory", internship_support_url: "https://uwaterloo.ca/co-operative-education" })
    );
    expect(set.ok && set.data.research_intensity).toBe("high");
    expect(set.ok && set.data.coop_program).toBe("mandatory");
    expect(set.ok && set.data.internship_support_url).toBe("https://uwaterloo.ca/co-operative-education");

    const bad = validateUniversityForm(
      makeForm({ research_intensity: "huge", coop_program: "sometimes", internship_support_url: "javascript:alert(1)" })
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.research_intensity).toBeDefined();
      expect(bad.errors.coop_program).toBeDefined();
      expect(bad.errors.internship_support_url).toBeDefined();
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
