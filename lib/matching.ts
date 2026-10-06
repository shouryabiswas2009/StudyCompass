import type { Profile, University } from "@/lib/types";

const BUDGET_WEIGHT = 50;
const COUNTRY_WEIGHT = 25;
const MAJOR_WEIGHT = 25;

function budgetScore(profile: Profile, university: University): number {
  if (university.tuition <= profile.budget_max) return BUDGET_WEIGHT;

  // Tuition is over budget — lose points proportionally to how far over.
  // budget_min doesn't penalize here; it's a display/filter preference, not
  // a sign of a worse fit.
  const overBy = (university.tuition - profile.budget_max) / profile.budget_max;
  return Math.max(0, Math.round(BUDGET_WEIGHT * (1 - overBy)));
}

function countryMatches(profile: Profile, university: University): boolean {
  const country = university.country.trim().toLowerCase();
  return profile.preferred_countries.some(
    (preferred) => preferred.trim().toLowerCase() === country
  );
}

// Finds the first of the student's intended majors that lines up with one
// of the university's popular programs. Shared by the score, the
// explanation, and the subject-specific ranking lookup below.
function findMatchingProgram(
  profile: Profile,
  university: University
): { major: string; program: string } | null {
  for (const rawMajor of profile.intended_majors) {
    const major = rawMajor.trim().toLowerCase();
    if (!major) continue;

    const program = university.popular_programs.find(
      (p) => p.toLowerCase().includes(major) || major.includes(p.toLowerCase())
    );
    if (program) return { major: rawMajor, program };
  }
  return null;
}

// A 0-100 score describing how well a university fits a student's profile.
export function computeMatchScore(
  profile: Profile,
  university: University
): number {
  const score =
    budgetScore(profile, university) +
    (countryMatches(profile, university) ? COUNTRY_WEIGHT : 0) +
    (findMatchingProgram(profile, university) ? MAJOR_WEIGHT : 0);

  return Math.min(100, Math.max(0, score));
}

// A short, deterministic explanation of *why* a university matched —
// no external API calls, just plain template logic over the same factors
// used in computeMatchScore.
export function explainMatch(profile: Profile, university: University): string {
  const reasons: string[] = [];

  if (university.tuition <= profile.budget_max) {
    reasons.push(`fits within your budget of $${profile.budget_max.toLocaleString()}`);
  } else {
    reasons.push("is a bit above your budget but still worth considering");
  }

  if (countryMatches(profile, university)) {
    reasons.push(`is located in one of your preferred countries (${university.country})`);
  }

  const match = findMatchingProgram(profile, university);
  if (match) {
    reasons.push(`offers strong programs in ${match.program}`);
  }

  if (reasons.length === 1) {
    return `This university ${reasons[0]}.`;
  }

  const last = reasons[reasons.length - 1];
  const rest = reasons.slice(0, -1);
  return `This university ${rest.join(", ")}, and ${last}.`;
}

// The ranking to show a given student for a given university: subject-specific
// when their intended major lines up with a ranked program, otherwise the
// university-wide ranking — always labeled so it's never misleading.
export function getDisplayRanking(
  university: University,
  profile: Profile
): { rank: number; label: string } {
  const match = findMatchingProgram(profile, university);
  if (match) {
    const subjectRank = university.program_rankings[match.program];
    if (subjectRank != null) {
      return { rank: subjectRank, label: match.program };
    }
  }

  return { rank: university.qs_ranking, label: "Overall" };
}
