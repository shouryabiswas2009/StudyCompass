import { describe, expect, it } from "vitest";
import { mergeSectionForm, profileToFormData } from "@/lib/profile-sections";
import { profileCompleteness } from "@/lib/profile-completeness";
import { PROFILE_PRESETS, findPreset, withPreset } from "@/lib/profile-presets";
import { isDisplayCurrency } from "@/lib/display-currency";
import { isGradeSystem } from "@/lib/grades";
import { validateProfileForm } from "@/lib/profile-validation";
import type { Profile } from "@/lib/types";

const saved: Profile = {
  id: "s", full_name: "Asha", country: "India", intended_majors: ["Computer Science", "Mathematics"], gpa_percentage: 89.8,
  ielts_score: 7.5, sat_score: null, budget_min: 0, budget_max: 45000, preferred_countries: ["Canada", "United Kingdom"],
  preferred_degree_level: "Undergraduate", focuses: ["research"], display_currency: "INR", grade_system: "ib",
  grade_input: "7, 6, 6, 5, 6, 7", grade_basis: "converted", visa_mode: "factor", visa_weight: "high", stay_after: "yes",
  created_at: "", updated_at: "",
};
const form = (fields: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) fd.append(k, x);
  return fd;
};

describe("saving one section", () => {
  it("round-trips a saved profile through the form unchanged", () => {
    const r = validateProfileForm(profileToFormData(saved));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        full_name: "Asha", intended_majors: ["Computer Science", "Mathematics"], gpa_percentage: 89.8, grade_basis: "converted",
        preferred_countries: ["Canada", "United Kingdom"], focuses: ["research"], visa_mode: "factor", visa_weight: "high", stay_after: "yes",
      });
    }
  });

  it("changes only that section's fields (saving Money keeps majors, grades and visa)", () => {
    const merged = mergeSectionForm(saved, "money", form({ budget_min: "5000", budget_max: "60000", display_currency: "CAD" }));
    const r = validateProfileForm(merged);
    expect(r.ok && [r.data.budget_max, r.data.display_currency, r.data.intended_majors, r.data.gpa_percentage, r.data.visa_mode]).toEqual([
      60000, "CAD", ["Computer Science", "Mathematics"], 89.8, "factor",
    ]);
  });

  it("lets a section clear its own optional fields without touching others", () => {
    const merged = mergeSectionForm(saved, "academics", form({ grade_system: "ca_ontario", gpa_percentage: "91", ielts_score: "", sat_score: "" }));
    const r = validateProfileForm(merged);
    expect(r.ok && [r.data.grade_system, r.data.gpa_percentage, r.data.grade_input, r.data.ielts_score, r.data.budget_max]).toEqual([
      "ca_ontario", 91, null, null, 45000,
    ]);
  });

  it("still loads and saves old profiles (grade_system 'ib' or 'other', no visa or currency)", () => {
    const old = { ...saved, grade_system: "other" as const, grade_input: null, gpa_percentage: 77, display_currency: undefined, visa_mode: undefined, visa_weight: undefined, stay_after: undefined };
    const r = validateProfileForm(mergeSectionForm(old, "about", form({ full_name: "Asha K", country: "India" })));
    expect(r.ok && [r.data.full_name, r.data.grade_system, r.data.gpa_percentage, r.data.display_currency, r.data.visa_mode]).toEqual([
      "Asha K", "other", 77, "USD", "ignore",
    ]);
  });
});

describe("profileCompleteness", () => {
  it("counts real fields and says what each missing one changes", () => {
    const c = profileCompleteness(saved);
    expect([c.filled, c.total]).toEqual([8, 9]);
    expect(c.missing.map((m) => m.key)).toEqual(["sat"]);
    expect(c.missing[0].why).toMatch(/admission chances for US schools/);
  });
  it("is 0 of 9 with no profile, and notices an unchosen visa setting", () => {
    expect(profileCompleteness(null)).toMatchObject({ filled: 0, total: 9 });
    expect(profileCompleteness({ ...saved, visa_mode: null }).missing.map((m) => m.key)).toContain("visa");
  });
});

describe("presets", () => {
  it("only use valid systems, currencies and countries", () => {
    for (const p of PROFILE_PRESETS) {
      if (p.values.grade_system) expect(isGradeSystem(p.values.grade_system)).toBe(true);
      if (p.values.display_currency) expect(isDisplayCurrency(p.values.display_currency)).toBe(true);
    }
  });
  it("pre-fill on top of the saved profile, keeping everything else", () => {
    const filled = withPreset(saved, findPreset("canada-grade12"));
    expect(filled).toMatchObject({ country: "Canada", grade_system: "ca_ontario", full_name: "Asha", budget_max: 45000 });
    expect(withPreset(saved, findPreset("nope"))).toBe(saved);
  });
});
