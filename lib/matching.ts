import type { Profile, University } from "@/lib/types";

const BUDGET_WEIGHT = 50;
const COUNTRY_WEIGHT = 25;
const MAJOR_WEIGHT = 25;

// Tuition below this fraction of the student's minimum budget gets a
// "much cheaper than your range" note. A gap that big usually means a
// different system (e.g. tuition-free public universities) or a fee that
// leaves out costs, so it's worth a closer look. It never lowers the score:
// paying less isn't a worse fit.
const MUCH_CHEAPER_RATIO = 0.5;

function budgetScore(profile: Profile, university: University): number {
  if (university.tuition <= profile.budget_max) return BUDGET_WEIGHT;

  // Tuition is over budget — lose points proportionally to how far over.
  const overBy = (university.tuition - profile.budget_max) / profile.budget_max;
  return Math.max(0, Math.round(BUDGET_WEIGHT * (1 - overBy)));
}

// A school that doesn't offer the student's degree level can't be a match,
// however well it scores otherwise. An empty list means we don't know the
// school's levels, so we don't rule it out.
export function offersDegreeLevel(profile: Profile, university: University): boolean {
  const levels = university.degree_levels ?? [];
  return levels.length === 0 || levels.includes(profile.preferred_degree_level);
}

function isMuchCheaperThanRange(profile: Profile, university: University): boolean {
  return university.tuition < profile.budget_min * MUCH_CHEAPER_RATIO;
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
  if (!offersDegreeLevel(profile, university)) return 0;

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
  if (!offersDegreeLevel(profile, university)) {
    return `This university doesn't offer ${profile.preferred_degree_level} programs, so it isn't a match for you.`;
  }

  const reasons: string[] = [];

  if (isMuchCheaperThanRange(profile, university)) {
    reasons.push(
      `is much cheaper than your range ($${university.tuition.toLocaleString()} vs. your minimum of $${profile.budget_min.toLocaleString()}) — worth checking what the fee covers`
    );
  } else if (university.tuition <= profile.budget_max) {
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
