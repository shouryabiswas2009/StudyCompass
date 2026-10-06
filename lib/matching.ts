import type { Profile, University } from "@/lib/types";

// ─── Scoring weights ─────────────────────────────────────────────────────
// The one place the weights live. They add up to 100, so each reads as
// "how many points out of 100 this factor is worth". Budget is heaviest
// because a school a student can't afford isn't a real option.
export const WEIGHTS = {
  budget: 30,
  major: 20,
  academic: 20,
  country: 15,
  english: 10,
  acceptance: 5,
} as const;

export type FactorKey = keyof typeof WEIGHTS;

const FACTOR_LABELS: Record<FactorKey, string> = {
  budget: "Budget",
  major: "Major",
  academic: "Academic fit",
  country: "Country",
  english: "English",
  acceptance: "Acceptance rate",
};

export type FactorScore = {
  key: FactorKey;
  label: string;
  max: number;
  // null = we can't tell (e.g. no SAT on either side). Unknown factors are
  // left out of the total rather than counted as zero.
  points: number | null;
};

export type AdmissionChance = "Reach" | "Match" | "Safety";

export type MatchResult = {
  score: number; // 0-100
  eligible: boolean; // false when the school lacks the student's degree level
  factors: FactorScore[];
  chance: AdmissionChance;
};

export type MatchExplanation = { strengths: string[]; concerns: string[] };

// Tuition below this fraction of the student's minimum budget gets a
// "much cheaper than your range" note. A gap that big usually means a
// different system (e.g. tuition-free public universities) or a fee that
// leaves out costs. It never lowers the score: paying less isn't a worse fit.
const MUCH_CHEAPER_RATIO = 0.5;

// Reach/Match/Safety thresholds. This hand-tuned rule is the baseline a
// trained model has to beat later (Phase 6).
const REACH_IF_ACCEPTANCE_BELOW = 15; // % — this selective is a reach for anyone
const REACH_IF_ACADEMIC_FIT_BELOW = 0.5;
const SAFETY_ACADEMIC_FIT = 0.85;
const SAFETY_MIN_ACCEPTANCE = 50; // %

// ─── Small helpers ───────────────────────────────────────────────────────
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function isKnown(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !Number.isNaN(value);
}

// Fixed locale so server and browser format numbers the same way.
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function countryMatches(profile: Profile, university: University): boolean {
  const country = university.country.trim().toLowerCase();
  return profile.preferred_countries.some(
    (preferred) => preferred.trim().toLowerCase() === country
  );
}

// Finds the first of the student's intended majors that lines up with one
// of the university's popular programs. Shared by the score, the
// explanation, and the subject-specific ranking lookup.
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

// ─── Factor fits: each returns 0..1, or null when unknown ────────────────

function budgetFit(profile: Profile, university: University): number {
  if (university.tuition <= profile.budget_max) return 1;
  // Lose credit in proportion to how far over budget: 50% over → 0.5.
  const overBy = (university.tuition - profile.budget_max) / profile.budget_max;
  return clamp01(1 - overBy);
}

// GPA gap in percentage points vs the typical admitted student:
// +5 or more → 1, exactly average → 0.75, -10 → 0.25, -15 or worse → 0.
function gpaFit(profile: Profile, university: University): number | null {
  if (!isKnown(university.avg_admitted_gpa)) return null;
  const gap = profile.gpa_percentage - university.avg_admitted_gpa;
  return clamp01(0.75 + gap / 20);
}

// Position within the middle-50% SAT range: at the 25th percentile → 0.5,
// at the 75th or above → 1, one full range-width below the 25th → 0.
function satFit(profile: Profile, university: University): number | null {
  if (!isKnown(profile.sat_score) || !isKnown(university.sat_25) || !isKnown(university.sat_75)) {
    return null;
  }
  const rangeWidth = Math.max(university.sat_75 - university.sat_25, 10);
  const position = (profile.sat_score - university.sat_25) / rangeWidth;
  return clamp01(0.5 + 0.5 * position);
}

// Average of whichever academic signals we have. GPA is always on the
// profile; SAT is optional and US-only, so it often drops out.
function academicFit(profile: Profile, university: University): number | null {
  const parts = [gpaFit(profile, university), satFit(profile, university)].filter(isKnown);
  if (parts.length === 0) return null;
  return parts.reduce((sum, x) => sum + x, 0) / parts.length;
}

// Meeting the minimum → 1; half a band short → 0.5; a full band short → 0.
function englishFit(profile: Profile, university: University): number | null {
  if (!isKnown(profile.ielts_score) || !isKnown(university.min_ielts)) return null;
  return clamp01(1 + (profile.ielts_score - university.min_ielts));
}

function acceptanceFit(university: University): number {
  return clamp01(university.acceptance_rate / 100);
}

// ─── Public API ──────────────────────────────────────────────────────────

export function admissionChance(
  academic: number | null,
  acceptanceRate: number
): AdmissionChance {
  if (acceptanceRate < REACH_IF_ACCEPTANCE_BELOW) return "Reach";
  // Without academic data we can't honestly call a school a safety.
  if (academic === null) return "Match";
  if (academic < REACH_IF_ACADEMIC_FIT_BELOW) return "Reach";
  if (academic >= SAFETY_ACADEMIC_FIT && acceptanceRate >= SAFETY_MIN_ACCEPTANCE) {
    return "Safety";
  }
  return "Match";
}

// How well a university fits a student: a 0-100 score plus the points
// behind it, so the UI can show *why* and not just a number.
export function computeMatchScore(profile: Profile, university: University): MatchResult {
  const fits: Record<FactorKey, number | null> = {
    budget: budgetFit(profile, university),
    major: findMatchingProgram(profile, university) ? 1 : 0,
    academic: academicFit(profile, university),
    country: countryMatches(profile, university) ? 1 : 0,
    english: englishFit(profile, university),
    acceptance: acceptanceFit(university),
  };

  const factors: FactorScore[] = (Object.keys(WEIGHTS) as FactorKey[]).map((key) => {
    const fit = fits[key];
    return {
      key,
      label: FACTOR_LABELS[key],
      max: WEIGHTS[key],
      points: fit === null ? null : Math.round(fit * WEIGHTS[key] * 10) / 10,
    };
  });

  // Rescale over the factors we actually know, so a missing SAT or IELTS
  // is "unknown", not a zero that drags the score down.
  const known = factors.filter((f) => f.points !== null);
  const earned = known.reduce((sum, f) => sum + (f.points ?? 0), 0);
  const possible = known.reduce((sum, f) => sum + f.max, 0);

  const eligible = offersDegreeLevel(profile, university);
  const score = eligible && possible > 0 ? Math.round((earned / possible) * 100) : 0;

  return {
    score,
    eligible,
    factors,
    chance: admissionChance(fits.academic, university.acceptance_rate),
  };
}

// Plain-language strengths and concerns built from the same factors as the
// score, so the weak spots are visible and not just the good news. Some
// concerns (like living costs) don't change the score but are worth knowing.
export function explainMatch(profile: Profile, university: University): MatchExplanation {
  const strengths: string[] = [];
  const concerns: string[] = [];

  if (!offersDegreeLevel(profile, university)) {
    concerns.push(
      `Doesn't offer ${profile.preferred_degree_level} programs, so it isn't an option for you.`
    );
    return { strengths, concerns };
  }

  // Budget
  const { tuition, living_cost_per_year: living } = university;
  if (tuition <= profile.budget_max) {
    strengths.push(`Tuition (${usd(tuition)}/yr) fits your budget of ${usd(profile.budget_max)}.`);
    if (isKnown(living) && tuition + living > profile.budget_max) {
      concerns.push(
        `With living costs (about ${usd(living)}/yr), the total is about ${usd(tuition + living)}/yr — above your budget.`
      );
    }
  } else {
    concerns.push(
      `Tuition (${usd(tuition)}/yr) is ${usd(tuition - profile.budget_max)} over your budget.`
    );
  }
  if (isMuchCheaperThanRange(profile, university)) {
    concerns.push(
      `Tuition is much cheaper than your range (you set a minimum of ${usd(profile.budget_min)}) — check what the fee covers.`
    );
  }

  // Country
  if (countryMatches(profile, university)) {
    strengths.push(`In one of your preferred countries (${university.country}).`);
  } else {
    concerns.push(`Not in your preferred countries (it's in ${university.country}).`);
  }

  // Major, with the subject ranking when we have one
  const match = findMatchingProgram(profile, university);
  if (match) {
    const subjectRank = university.program_rankings[match.program];
    strengths.push(
      subjectRank != null
        ? `Offers ${match.program} (subject ranking #${subjectRank}).`
        : `Offers ${match.program}.`
    );
  } else {
    concerns.push("None of your intended majors are among its popular programs.");
  }

  // GPA
  const avgGpa = university.avg_admitted_gpa;
  if (isKnown(avgGpa)) {
    if (profile.gpa_percentage >= avgGpa) {
      strengths.push(
        `Your GPA (${profile.gpa_percentage}) is at or above the typical admitted average (${avgGpa}).`
      );
    } else {
      concerns.push(
        `Your GPA (${profile.gpa_percentage}) is below the typical admitted average (${avgGpa}).`
      );
    }
  }

  // SAT — only US schools in the sample data have a range
  const { sat_25, sat_75 } = university;
  if (isKnown(sat_25) && isKnown(sat_75)) {
    const range = `${sat_25}–${sat_75}`;
    const sat = profile.sat_score;
    if (!isKnown(sat)) {
      concerns.push(`No SAT score on your profile yet — admitted students typically score ${range}.`);
    } else if (sat >= sat_75) {
      strengths.push(`Your SAT (${sat}) is above the typical range (${range}).`);
    } else if (sat >= sat_25) {
      strengths.push(`Your SAT (${sat}) is within the typical range (${range}).`);
    } else {
      concerns.push(`Your SAT (${sat}) is below the typical range (${range}).`);
    }
  }

  // English
  const minIelts = university.min_ielts;
  if (isKnown(minIelts)) {
    const ielts = profile.ielts_score;
    if (!isKnown(ielts)) {
      concerns.push(
        `No IELTS score on your profile — international applicants need at least ${minIelts.toFixed(1)}.`
      );
    } else if (ielts >= minIelts) {
      strengths.push(`Your IELTS (${ielts.toFixed(1)}) meets the ${minIelts.toFixed(1)} minimum.`);
    } else {
      concerns.push(`Your IELTS ${ielts.toFixed(1)} is below the ${minIelts.toFixed(1)} minimum.`);
    }
  }

  // Selectivity
  const rate = university.acceptance_rate;
  if (rate < REACH_IF_ACCEPTANCE_BELOW) {
    concerns.push(`Very selective: only about ${rate}% of applicants are admitted.`);
  } else if (rate >= SAFETY_MIN_ACCEPTANCE) {
    strengths.push(`Admits about ${rate}% of applicants.`);
  }

  return { strengths, concerns };
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

// Everything a university card needs, computed in one place so every page
// that lists universities scores them the same way.
export type MatchEntry = {
  university: University;
  match: MatchResult;
  explanation: MatchExplanation;
  ranking: { rank: number; label: string };
};

export function scoreUniversity(profile: Profile, university: University): MatchEntry {
  return {
    university,
    match: computeMatchScore(profile, university),
    explanation: explainMatch(profile, university),
    ranking: getDisplayRanking(university, profile),
  };
}
