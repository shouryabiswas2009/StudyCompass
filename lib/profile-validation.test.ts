import { describe, expect, it } from "vitest";
import { validateProfileForm } from "@/lib/profile-validation";

// Builds the FormData the profile form would submit. Pass `null` to leave
// a field out entirely.
function makeForm(overrides: Record<string, string | string[] | null> = {}): FormData {
  const fields: Record<string, string | string[] | null> = {
    full_name: "Test Student",
    country: "India",
    gpa_percentage: "92",
    ielts_score: "7.0",
    sat_score: "1350",
    budget_min: "0",
    budget_max: "40000",
    preferred_degree_level: "Undergraduate",
    intended_majors: ["Computer Science"],
    preferred_countries: ["Canada"],
    ...overrides,
  };

  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value === null) continue;
    for (const v of Array.isArray(value) ? value : [value]) formData.append(name, v);
  }
  return formData;
}

describe("validateProfileForm", () => {
  it("accepts a valid profile and converts numbers", () => {
    const result = validateProfileForm(makeForm());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.gpa_percentage).toBe(92);
      expect(result.data.sat_score).toBe(1350);
      expect(result.data.intended_majors).toEqual(["Computer Science"]);
    }
  });

  it("accepts any number of focuses (none = Balanced) and rejects unknown values", () => {
    const none = validateProfileForm(makeForm());
    expect(none.ok && none.data.focuses).toEqual([]);

    // Stored in a fixed order without repeats, whatever order they arrive in.
    const two = validateProfileForm(makeForm({ focuses: ["research", "academic", "research"] }));
    expect(two.ok && two.data.focuses).toEqual(["academic", "research"]);

    const bad = validateProfileForm(makeForm({ focuses: ["research", "fame"] }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.focuses).toBeDefined();
  });

  it("keeps a display currency we have a rate for, defaults to US dollars, and rejects others", () => {
    const none = validateProfileForm(makeForm());
    expect(none.ok && none.data.display_currency).toBe("USD");
    const inr = validateProfileForm(makeForm({ display_currency: "INR" }));
    expect(inr.ok && inr.data.display_currency).toBe("INR");
    const bad = validateProfileForm(makeForm({ display_currency: "BTC" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.display_currency).toBeDefined();
  });

  it("treats blank optional scores as missing, not as errors", () => {
    const result = validateProfileForm(makeForm({ ielts_score: "", sat_score: "" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.ielts_score).toBeNull();
      expect(result.data.sat_score).toBeNull();
    }
  });

  it.each([
    ["sat_score", "1355", /steps of 10/],
    ["sat_score", "300", /400 to 1600/],
    ["ielts_score", "6.3", /steps of 0.5/],
    ["ielts_score", "9.5", /0 to 9/],
    ["gpa_percentage", "105", /0 to 100/],
    ["gpa_percentage", "abc", /0 to 100/],
  ])("rejects %s = %s", (field, value, message) => {
    const result = validateProfileForm(makeForm({ [field]: value }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[field as keyof typeof result.errors]).toMatch(message);
    }
  });

  it("rejects a minimum budget above the maximum", () => {
    const result = validateProfileForm(makeForm({ budget_min: "50000", budget_max: "40000" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.budget_min).toMatch(/more than your maximum/);
  });

  it("requires at least one major and one preferred country", () => {
    const result = validateProfileForm(
      makeForm({ intended_majors: null, preferred_countries: null })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.intended_majors).toBeDefined();
      expect(result.errors.preferred_countries).toBeDefined();
    }
  });
});
