// The "Try it" quiz's answer options. Kept separate from lib/guest-quiz.ts
// (which scores answers on the server) so the form in the browser only
// downloads these lists, not the scoring engine.

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
