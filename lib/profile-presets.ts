import type { GradeSystem } from "@/lib/grades";
import type { Profile } from "@/lib/types";

// One-tap starting points for common situations. They only pre-fill the
// form (nothing is saved until the student presses Save), and every field
// stays editable. Plain config: add or change a preset here.

export type ProfilePreset = {
  key: string;
  label: string;
  description: string;
  values: Partial<Pick<Profile, "country" | "preferred_countries" | "display_currency">> & { grade_system?: GradeSystem };
};

export const PROFILE_PRESETS: ProfilePreset[] = [
  {
    key: "india-to-us",
    label: "Applying to the US from India",
    description: "Percentage grades, amounts also in rupees, US first.",
    values: { country: "India", grade_system: "percentage", display_currency: "INR", preferred_countries: ["United States"] },
  },
  {
    key: "canada-grade12",
    label: "Canadian Grade 12 → US / UK",
    description: "Ontario average (change the province if needed), amounts also in Canadian dollars.",
    values: { country: "Canada", grade_system: "ca_ontario", display_currency: "CAD", preferred_countries: ["United States", "United Kingdom"] },
  },
  {
    key: "ib-student",
    label: "IB student",
    description: "IB subject grades, converted with the IB's own suggested table.",
    values: { grade_system: "ib" },
  },
];

export function findPreset(key: string | undefined | null): ProfilePreset | null {
  return PROFILE_PRESETS.find((p) => p.key === key) ?? null;
}

// The values the form starts from: the saved profile with the preset's
// fields on top (or just the preset's, for a new profile).
export function withPreset<T extends Partial<Profile>>(profile: T | null, preset: ProfilePreset | null): Partial<Profile> | null {
  if (!preset) return profile;
  return { ...(profile ?? {}), ...preset.values };
}
