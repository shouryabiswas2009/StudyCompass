import type { Profile, ResearchFieldKey, UniversitySummary } from "@/lib/types";

// "Research impact (Leiden Ranking / OpenAlex)": how often a university's
// recent research is among the world's most cited, as a percentile of all
// universities in the CWTS Leiden Ranking Open Edition (built from OpenAlex
// data; both CC0). Built by scripts/research-impact/; how it works and why:
// docs/RESEARCH-IMPACT.md. It says nothing about teaching, so it's one
// quality signal among several, never a "ranking" of the school.

export const RESEARCH_IMPACT_LABEL = "Research impact (Leiden Ranking / OpenAlex)";

// How many universities the 2025 edition ranks (each percentile compares
// with all of them). Change it with the edition (scripts/research-impact).
export const LEIDEN_UNIVERSITY_COUNT = 2831;

// Leiden's five main fields, by the short key stored in the database.
export const RESEARCH_FIELD_LABELS: Record<ResearchFieldKey, string> = {
  biomedical: "Biomedical and health sciences",
  life_earth: "Life and earth sciences",
  math_cs: "Mathematics and computer science",
  physical_eng: "Physical sciences and engineering",
  social_humanities: "Social sciences and humanities",
};

// Which Leiden field a major belongs to, from the topics Leiden lists for
// each field (the "Main fields" file of the 2025 edition). Checked in this
// order, so "biomedical engineering" is biomedical and "computer
// engineering" is mathematics and computer science, as Leiden files them.
// Majors split across fields (biology, psychology, architecture) use the
// overall figure.
const MAJOR_FIELDS: [RegExp, ResearchFieldKey][] = [
  [/computer|data science|software|artificial intelligence|machine learning|mathemat|statistic/, "math_cs"],
  [/biomedical|medicine|medical|nursing|pharmac|dentist|neuroscience/, "biomedical"],
  [/environment|earth science|geolog|agricultur|ecolog|forestry|veterinary|food science|oceanograph/, "life_earth"],
  [/engineering|physics|chemistry|astronom/, "physical_eng"],
  [/business|econom|financ|accounting|management|marketing|\blaw\b|linguistic|literature|history|political|sociolog|anthropolog|communication|criminolog|education/, "social_humanities"],
];

export function majorField(major: string): ResearchFieldKey | null {
  const text = major.trim().toLowerCase();
  if (!text) return null;
  return MAJOR_FIELDS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

export type ResearchImpactShown = {
  percentile: number; // 0-100
  field: ResearchFieldKey | null; // null: the overall figure
};

// The figure for this student: the field of their first major that has one,
// otherwise the overall figure. Null when the school isn't in the ranking.
export function researchImpactFor(profile: Pick<Profile, "intended_majors"> | null, university: UniversitySummary): ResearchImpactShown | null {
  const impact = university.research_impact;
  if (!impact) return null;
  for (const major of profile?.intended_majors ?? []) {
    const field = majorField(major);
    const value = field ? impact.fields?.[field] : undefined;
    if (field && typeof value === "number") return { percentile: value, field };
  }
  return typeof impact.overall === "number" ? { percentile: impact.overall, field: null } : null;
}

// "87th percentile", "1st", "22nd", "13th".
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

export function describeImpact(shown: ResearchImpactShown): string {
  const where = shown.field ? ` in ${RESEARCH_FIELD_LABELS[shown.field].toLowerCase()}` : "";
  return `${ordinal(shown.percentile)} percentile${where}`;
}
