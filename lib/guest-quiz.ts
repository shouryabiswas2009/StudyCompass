import { COUNTRY_OPTIONS, canonicalCountry } from "@/lib/countries";
import { computeMatchScore, type FactorKey } from "@/lib/matching";
import type { Profile, UniversitySummary } from "@/lib/types";

// The "Try it" quiz on the landing page: three questions, no account. The
// answers become a temporary profile in memory, scored with the same
// computeMatchScore() as everywhere else, and nothing is stored.

export const ANY_COUNTRY = "any";

export const QUIZ_BUDGETS = [15000, 25000, 40000, 60000, 80000] as const;

// The subject names the university data uses (College Scorecard fields and
// the curated program lists), so a pick matches real program lists.
export const QUIZ_MAJORS = [
  "Computer Science",
  "Data Science",
  "Engineering",
  "Business",
  "Economics",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biological Sciences",
  "Medicine",
  "Psychology",
  "Law",
  "Architecture",
] as const;

export type QuizAnswers = { country: string; budget: number; major: string };

export type QuizParse = { ok: true; answers: QuizAnswers } | { ok: false; error: string };

// Only accept values the quiz offers, so a hand-made request can't feed the
// scoring anything odd.
export function parseQuizAnswers(input: { country: unknown; budget: unknown; major: unknown }): QuizParse {
  const country = typeof input.country === "string" ? input.country : "";
  const budget = Number(input.budget);
  const major = typeof input.major === "string" ? input.major : "";
  if (country !== ANY_COUNTRY && !(COUNTRY_OPTIONS as readonly string[]).includes(country)) {
    return { ok: false, error: "Choose a country (or “Anywhere”)." };
  }
  if (!(QUIZ_BUDGETS as readonly number[]).includes(budget)) return { ok: false, error: "Choose a yearly budget." };
  if (!(QUIZ_MAJORS as readonly string[]).includes(major)) return { ok: false, error: "Choose what you'd like to study." };
  return { ok: true, answers: { country, budget, major } };
}

// What the quiz doesn't know about a guest: grades, test scores and English
// level (and the country, if they said "Anywhere"). These are left out of
// the score instead of counting against anyone.
export function unknownFactors(answers: QuizAnswers): FactorKey[] {
  const unknown: FactorKey[] = ["academic", "english", "acceptance"];
  if (answers.country === ANY_COUNTRY) unknown.push("country");
  return unknown;
}

// A temporary profile built from the three answers. Never saved.
export function guestProfile(answers: QuizAnswers): Profile {
  return {
    id: "guest",
    full_name: "Guest",
    country: "",
    intended_majors: [answers.major],
    gpa_percentage: 0, // unused: "academic" is marked unknown
    ielts_score: null,
    sat_score: null,
    budget_min: 0,
    budget_max: answers.budget,
    preferred_countries: answers.country === ANY_COUNTRY ? [] : [answers.country],
    preferred_degree_level: "Undergraduate",
    focuses: [],
    created_at: "",
    updated_at: "",
  };
}

export type QuizMatch = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  score: number;
  // How many of the scoring factors were known for this school (the rest
  // are left out). Shown next to the score so a high number from little
  // information isn't mistaken for a sure thing.
  knownFactors: number;
  totalFactors: number;
  university: UniversitySummary;
};

// The guest's best five featured universities.
// - Only schools whose cost can be checked against the budget count: the
//   budget is one of the three questions, and a school with unknown tuition
//   would otherwise score well simply because it can't be judged.
// - Best score first; then the school the score knows more about; then the
//   better ranking; then the name, so the same answers give the same list.
export function guestTopMatches(universities: UniversitySummary[], answers: QuizAnswers, count = 5): QuizMatch[] {
  const profile = guestProfile(answers);
  const unknown = unknownFactors(answers);
  return universities
    .filter((u) => u.created_by === null && u.is_featured === true)
    .filter((u) => answers.country === ANY_COUNTRY || canonicalCountry(u.country) === answers.country)
    .map((university) => {
      const result = computeMatchScore(profile, university, { unknown });
      const counted = result.factors.filter((f) => !unknown.includes(f.key));
      return {
        university,
        score: result.score,
        budgetKnown: result.factors.some((f) => f.key === "budget" && f.points !== null),
        knownFactors: counted.filter((f) => f.points !== null).length,
        totalFactors: counted.length,
      };
    })
    .filter((m) => m.budgetKnown)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.knownFactors - a.knownFactors ||
        (a.university.qs_ranking ?? Infinity) - (b.university.qs_ranking ?? Infinity) ||
        a.university.name.localeCompare(b.university.name)
    )
    .slice(0, count)
    .map(({ university, score, knownFactors, totalFactors }) => ({
      id: university.id,
      name: university.name,
      country: university.country,
      city: university.city,
      score,
      knownFactors,
      totalFactors,
      university,
    }));
}
