import { usd } from "@/lib/format";
import {
  ADMISSION_MODEL_INFO,
  chanceFromProbability,
  predictAdmission,
  type AdmissionPrediction,
} from "@/lib/admission-model";
import {
  FOCUS_LABELS,
  RESEARCH_LABELS,
  RESEARCH_SCORES,
  focusOf,
} from "@/lib/focus";
import scorecardReference from "@/lib/scorecard-reference.json";
import type { PrimaryFocus, Profile, UniversitySummary } from "@/lib/types";

// ─── Scoring weights ─────────────────────────────────────────────────────
// The one place the weights live. They add up to 100, so each reads as
// "how many points out of 100 this factor is worth". Budget is heaviest
// because a school a student can't afford isn't a real option. "focus" is
// the student's "what matters most to me" choice (see focusSignals below).
export const WEIGHTS = {
  budget: 25,
  major: 15,
  academic: 15,
  country: 10,
  english: 10,
  acceptance: 5,
  focus: 20,
} as const;

export type FactorKey = keyof typeof WEIGHTS;

const FACTOR_LABELS: Record<FactorKey, string> = {
  budget: "Budget",
  major: "Major",
  academic: "Academic fit",
  country: "Country",
  english: "English",
  acceptance: "Acceptance rate",
  focus: "Your focus",
};

export type FactorScore = {
  key: FactorKey;
  label: string;
  max: number;
  // null = we can't tell (e.g. no SAT on either side). Unknown factors are
  // left out of the total rather than counted as zero.
  points: number | null;
  // Why points is null, when it isn't simply "unknown" (e.g. "Balanced"
  // doesn't use the focus factor at all).
  note?: string;
};

export type AdmissionChance = "Reach" | "Match" | "Safety";

export type MatchResult = {
  score: number; // 0-100
  eligible: boolean; // false when the school lacks the student's degree level
  factors: FactorScore[];
  chance: AdmissionChance;
  // "rule" = the hand-tuned admissionChance() below; "model" = the trained
  // logistic regression (see scoreUniversity).
  chanceSource: "rule" | "model";
};

export type MatchExplanation = { strengths: string[]; concerns: string[] };

// Tuition below this fraction of the student's minimum budget gets a
// "much cheaper than your range" note. A gap that big usually means a
// different system (e.g. tuition-free public universities) or a fee that
// leaves out costs. It never lowers the score: paying less isn't a worse fit.
const MUCH_CHEAPER_RATIO = 0.5;

// Reach/Match/Safety thresholds. This hand-tuned rule is the baseline the
// trained model (lib/admission-model.ts) is measured against; for
// undergraduate profiles scoreUniversity() uses the model instead, because
// it beat this rule on held-out data.
const REACH_IF_ACCEPTANCE_BELOW = 15; // % — this selective is a reach for anyone
const REACH_IF_ACADEMIC_FIT_BELOW = 0.5;
const SAFETY_ACADEMIC_FIT = 0.85;
const SAFETY_MIN_ACCEPTANCE = 50; // %

// ─── Small helpers ───────────────────────────────────────────────────────
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function isKnown(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !Number.isNaN(value);
}


export function countryMatches(profile: Profile, university: UniversitySummary): boolean {
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
  university: UniversitySummary
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
export function offersDegreeLevel(profile: Profile, university: UniversitySummary): boolean {
  const levels = university.degree_levels ?? [];
  return levels.length === 0 || levels.includes(profile.preferred_degree_level);
}

function isMuchCheaperThanRange(profile: Profile, university: UniversitySummary): boolean {
  return university.tuition < profile.budget_min * MUCH_CHEAPER_RATIO;
}

// ─── Factor fits: each returns 0..1, or null when unknown ────────────────

function budgetFit(profile: Profile, university: UniversitySummary): number {
  if (university.tuition <= profile.budget_max) return 1;
  // Lose credit in proportion to how far over budget: 50% over → 0.5.
  const overBy = (university.tuition - profile.budget_max) / profile.budget_max;
  return clamp01(1 - overBy);
}

// GPA gap in percentage points vs the typical admitted student:
// +5 or more → 1, exactly average → 0.75, -10 → 0.25, -15 or worse → 0.
function gpaFit(profile: Profile, university: UniversitySummary): number | null {
  if (!isKnown(university.avg_admitted_gpa)) return null;
  const gap = profile.gpa_percentage - university.avg_admitted_gpa;
  return clamp01(0.75 + gap / 20);
}

// Position within the middle-50% SAT range: at the 25th percentile → 0.5,
// at the 75th or above → 1, one full range-width below the 25th → 0.
function satFit(profile: Profile, university: UniversitySummary): number | null {
  if (!isKnown(profile.sat_score) || !isKnown(university.sat_25) || !isKnown(university.sat_75)) {
    return null;
  }
  const rangeWidth = Math.max(university.sat_75 - university.sat_25, 10);
  const position = (profile.sat_score - university.sat_25) / rangeWidth;
  return clamp01(0.5 + 0.5 * position);
}

// Average of whichever academic signals we have. GPA is always on the
// profile; SAT is optional and US-only, so it often drops out.
function academicFit(profile: Profile, university: UniversitySummary): number | null {
  const parts = [gpaFit(profile, university), satFit(profile, university)].filter(isKnown);
  if (parts.length === 0) return null;
  return parts.reduce((sum, x) => sum + x, 0) / parts.length;
}

// Meeting the minimum → 1; half a band short → 0.5; a full band short → 0.
function englishFit(profile: Profile, university: UniversitySummary): number | null {
  if (!isKnown(profile.ielts_score) || !isKnown(university.min_ielts)) return null;
  return clamp01(1 + (profile.ielts_score - university.min_ielts));
}

function acceptanceFit(university: UniversitySummary): number {
  return clamp01(university.acceptance_rate / 100);
}

// ─── Focus signals ───────────────────────────────────────────────────────
// Each focus picks which university figures count. A signal is only
// included when we actually have the figure, so the focus factor is the
// average of what's known, and null (left out) when nothing is.

export type FocusSignal = { name: string; value: number }; // value 0..1

// Rankings on a log scale, like the offers page: #1 → 1, #10 → 0.67,
// #100 → 0.33, #1000 or lower → 0. Going from #10 to #5 matters more than
// going from #210 to #205.
export function rankScore(rank: number): number {
  return clamp01(1 - Math.log10(Math.max(rank, 1)) / 3);
}

// Where a school's median earnings sit between the 10th and 90th percentile
// of all imported US schools (lib/scorecard-reference.json, written by the
// import script), so the cut-offs come from the data, not from a guess.
const EARNINGS = scorecardReference.median_earnings_10yr;
export function earningsScore(earnings: number): number {
  return clamp01((earnings - EARNINGS.p10) / (EARNINGS.p90 - EARNINGS.p10));
}

// Tuition + living cost per year, or null when living cost is unknown —
// tuition alone would make a school look cheaper than it is.
function totalCostPerYear(university: UniversitySummary): number | null {
  const living = university.living_cost_per_year;
  return isKnown(living) ? university.tuition + living : null;
}

// Total cost vs. the student's maximum budget: half the budget or less → 1,
// exactly the budget → 0.5, 1.5× the budget or more → 0.
function affordabilityScore(total: number, budgetMax: number): number {
  return clamp01(1.5 - total / budgetMax);
}

function subjectRanking(profile: Profile, university: UniversitySummary) {
  const match = findMatchingProgram(profile, university);
  const rank = match ? university.program_rankings?.[match.program] : undefined;
  return match && isKnown(rank) ? { program: match.program, rank } : null;
}

// Research intensity as a 0..1 signal with its label, or null if unknown.
// Exported for the offers page.
export function researchSignal(university: UniversitySummary): { value: number; label: string } | null {
  const level = university.research_intensity;
  return level ? { value: RESEARCH_SCORES[level], label: RESEARCH_LABELS[level] } : null;
}

const hasCoopKnown = (university: UniversitySummary) =>
  university.has_coop === true || university.has_coop === false;

// Career outcomes (co-op program + graduate earnings) as one 0..1 signal,
// or null if neither is known. Exported for the offers page.
export function careerSignal(university: UniversitySummary): number | null {
  const parts: number[] = [];
  if (hasCoopKnown(university)) parts.push(university.has_coop ? 1 : 0);
  if (isKnown(university.median_earnings_10yr)) {
    parts.push(earningsScore(university.median_earnings_10yr));
  }
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
}

export function focusSignals(
  focus: PrimaryFocus,
  profile: Profile,
  university: UniversitySummary
): FocusSignal[] {
  const signals: FocusSignal[] = [];
  const add = (name: string, value: number | null | undefined) => {
    if (isKnown(value)) signals.push({ name, value });
  };
  const subject = subjectRanking(profile, university);
  const { qs_ranking, completion_rate, retention_rate, median_earnings_10yr } = university;

  switch (focus) {
    case "academic":
      add("subject ranking", subject ? rankScore(subject.rank) : null);
      add("overall ranking", isKnown(qs_ranking) ? rankScore(qs_ranking) : null);
      add("completion rate", isKnown(completion_rate) ? completion_rate / 100 : null);
      add("retention rate", isKnown(retention_rate) ? retention_rate / 100 : null);
      break;
    case "work_experience":
      add("co-op / internship program", hasCoopKnown(university) ? (university.has_coop ? 1 : 0) : null);
      add("graduate earnings", isKnown(median_earnings_10yr) ? earningsScore(median_earnings_10yr) : null);
      break;
    case "research":
      add("research intensity", researchSignal(university)?.value);
      add("subject ranking", subject ? rankScore(subject.rank) : null);
      break;
    case "affordability": {
      const total = totalCostPerYear(university);
      add("total cost vs. budget", total === null ? null : affordabilityScore(total, profile.budget_max));
      break;
    }
    case "balanced":
      break; // no extra factor: the other factors already balance things
  }
  return signals;
}

function focusFit(focus: PrimaryFocus, profile: Profile, university: UniversitySummary): number | null {
  const signals = focusSignals(focus, profile, university);
  if (signals.length === 0) return null;
  return signals.reduce((sum, s) => sum + s.value, 0) / signals.length;
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
export function computeMatchScore(profile: Profile, university: UniversitySummary): MatchResult {
  const focus = focusOf(profile);
  const fits: Record<FactorKey, number | null> = {
    budget: budgetFit(profile, university),
    // No program list at all means we don't know, not that none match.
    major: (university.popular_programs ?? []).length === 0
      ? null
      : findMatchingProgram(profile, university) ? 1 : 0,
    academic: academicFit(profile, university),
    country: countryMatches(profile, university) ? 1 : 0,
    english: englishFit(profile, university),
    acceptance: acceptanceFit(university),
    focus: focusFit(focus, profile, university),
  };

  const factors: FactorScore[] = (Object.keys(WEIGHTS) as FactorKey[]).map((key) => {
    const fit = fits[key];
    const factor: FactorScore = {
      key,
      label: key === "focus" ? `Your focus: ${FOCUS_LABELS[focus]}` : FACTOR_LABELS[key],
      max: WEIGHTS[key],
      points: fit === null ? null : Math.round(fit * WEIGHTS[key] * 10) / 10,
    };
    if (key === "focus" && fit === null) {
      factor.note = focus === "balanced" ? "Not used (Balanced)" : "No data for this school (not counted)";
    }
    return factor;
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
    chanceSource: "rule",
  };
}

// Says where a figure came from, so an official number and one a student
// typed in never read the same.
function fromWhere(university: UniversitySummary): string {
  if (university.source === "College Scorecard") return "College Scorecard";
  if (university.source === "user-entered") return "entered by you";
  return "illustrative";
}

// Lines about the student's chosen focus. They go first in the lists, so
// the short card view shows them. "Not available" notes go last, after the
// real concerns, so they don't crowd out what we do know.
function explainFocus(
  focus: PrimaryFocus,
  profile: Profile,
  university: UniversitySummary
): MatchExplanation & { unavailable: string[] } {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const unavailable: string[] = [];
  const source = fromWhere(university);

  // Rankings in this app are illustrative for every school (Scorecard has
  // none), so ranking lines always say so.
  const subjectLine = () => {
    const subject = subjectRanking(profile, university);
    if (!subject) return;
    const text = `#${subject.rank} in ${subject.program} (illustrative ranking).`;
    if (subject.rank <= 100) strengths.push(`Strong subject ranking: ${text}`);
    else concerns.push(`Subject ranking outside the top 100: ${text}`);
  };

  switch (focus) {
    case "academic": {
      subjectLine();
      const rank = university.qs_ranking;
      if (isKnown(rank) && rank <= 100) strengths.push(`Ranked #${rank} overall (illustrative ranking).`);
      else if (isKnown(rank) && rank > 200) concerns.push(`Ranked #${rank} overall (illustrative ranking).`);

      const completion = university.completion_rate;
      if (isKnown(completion) && completion >= 80) {
        strengths.push(`${completion}% of students graduate within 6 years (${source}).`);
      } else if (isKnown(completion) && completion < 60) {
        concerns.push(`Only ${completion}% of students graduate within 6 years (${source}).`);
      }
      const retention = university.retention_rate;
      if (isKnown(retention) && retention >= 90) {
        strengths.push(`${retention}% of first-year students come back for a second year (${source}).`);
      } else if (isKnown(retention) && retention < 75) {
        concerns.push(`Only ${retention}% of first-year students come back for a second year (${source}).`);
      }
      if (focusSignals(focus, profile, university).length === 0) {
        unavailable.push("Rankings, graduation and retention rates: not available for this school.");
      }
      break;
    }
    case "work_experience": {
      if (university.has_coop === true) {
        strengths.push(`Has a co-op / internship program (${source}).`);
      } else if (university.has_coop === false) {
        concerns.push(`No co-op / internship program (${source}).`);
      } else {
        unavailable.push("Co-op / internship program: not available for this school.");
      }
      const earnings = university.median_earnings_10yr;
      if (isKnown(earnings)) {
        const side = earnings >= EARNINGS.p50 ? "above" : "below";
        const line = `Graduates' median earnings 10 years after starting: ${usd(earnings)}, ${side} the middle of US schools here (${usd(EARNINGS.p50)}) (${source}).`;
        (side === "above" ? strengths : concerns).push(line);
      } else {
        unavailable.push("Graduate earnings: not available for this school.");
      }
      break;
    }
    case "research": {
      const research = researchSignal(university);
      if (!research) {
        unavailable.push("Research intensity: not available for this school.");
      } else {
        const line = `${research.label} — Carnegie classification (${source}).`;
        (research.value >= RESEARCH_SCORES.high ? strengths : concerns).push(line);
      }
      subjectLine();
      break;
    }
    case "affordability": {
      const total = totalCostPerYear(university);
      if (total === null) {
        unavailable.push("Living costs: not available, so the total cost can't be checked against your budget.");
      } else if (total <= profile.budget_max / 2) {
        strengths.push(`Tuition plus living costs (about ${usd(total)}/yr) is well under your budget.`);
      } else if (total <= profile.budget_max) {
        strengths.push(`Tuition plus living costs (about ${usd(total)}/yr) fits your budget.`);
      } else {
        concerns.push(
          `Tuition plus living costs (about ${usd(total)}/yr) is ${usd(total - profile.budget_max)} over your budget.`
        );
      }
      break;
    }
    case "balanced":
      break;
  }
  return { strengths, concerns, unavailable };
}

// Plain-language strengths and concerns built from the same factors as the
// score, so the weak spots are visible and not just the good news. Some
// concerns (like living costs) don't change the score but are worth knowing.
export function explainMatch(profile: Profile, university: UniversitySummary): MatchExplanation {
  if (!offersDegreeLevel(profile, university)) {
    return {
      strengths: [],
      concerns: [`Doesn't offer ${profile.preferred_degree_level} programs, so it isn't an option for you.`],
    };
  }

  // The chosen focus goes first, so it shows even on the short card view.
  const focus = focusOf(profile);
  const focusLines = explainFocus(focus, profile, university);
  const strengths: string[] = [...focusLines.strengths];
  const concerns: string[] = [...focusLines.concerns];

  // Budget
  const { tuition, living_cost_per_year: living } = university;
  if (tuition <= profile.budget_max) {
    strengths.push(`Tuition (${usd(tuition)}/yr) fits your budget of ${usd(profile.budget_max)}.`);
    // The affordability focus already said this, with the total, above.
    if (focus !== "affordability" && isKnown(living) && tuition + living > profile.budget_max) {
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
    const subjectRank = university.program_rankings?.[match.program];
    strengths.push(
      subjectRank != null
        ? `Offers ${match.program} (subject ranking #${subjectRank}).`
        : `Offers ${match.program}.`
    );
  } else {
    if ((university.popular_programs ?? []).length > 0) {
      concerns.push("None of your intended majors are among its popular programs.");
    }
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

  concerns.push(...focusLines.unavailable);
  return { strengths, concerns };
}

// rank is null for an unranked school (only possible for ones students add).
export type DisplayRanking = { rank: number | null; label: string };

// The ranking to show a given student for a given university: subject-specific
// when their intended major lines up with a ranked program, otherwise the
// university-wide ranking — always labeled so it's never misleading.
export function getDisplayRanking(
  university: UniversitySummary,
  profile: Profile
): DisplayRanking {
  const match = findMatchingProgram(profile, university);
  if (match) {
    const subjectRank = university.program_rankings?.[match.program];
    if (subjectRank != null) {
      return { rank: subjectRank, label: match.program };
    }
  }

  return { rank: university.qs_ranking ?? null, label: "Overall" };
}

export function formatRank(rank: number | null): string {
  // "Not available" rather than "Unranked": most official (Scorecard) schools
  // simply have no QS ranking in this dataset, which isn't the same as being
  // unranked.
  return rank === null ? "Ranking not available" : `#${rank}`;
}

// Everything a university card needs, computed in one place so every page
// that lists universities scores them the same way.
export type MatchEntry = {
  university: UniversitySummary;
  match: MatchResult;
  explanation: MatchExplanation;
  ranking: DisplayRanking;
  // Estimated admission probability from the trained model, or null when
  // it doesn't apply (see below).
  prediction: AdmissionPrediction | null;
};

// The trained model only replaces the rule-based Reach/Match/Safety label
// when (1) training showed it beats the rule on held-out data, (2) the
// student is applying for undergraduate study, and (3) the school has
// official College Scorecard figures — the synthetic training data was
// built around those schools' real admission rates and SAT ranges, so
// using it on illustrative or student-entered figures would be guesswork.
export function scoreUniversity(profile: Profile, university: UniversitySummary): MatchEntry {
  const match = computeMatchScore(profile, university);
  const prediction =
    profile.preferred_degree_level === "Undergraduate" && university.source === "College Scorecard"
      ? predictAdmission(profile, university)
      : null;

  if (prediction && ADMISSION_MODEL_INFO.beatsBaseline) {
    match.chance = chanceFromProbability(prediction.probability);
    match.chanceSource = "model";
  }

  return {
    university,
    match,
    explanation: explainMatch(profile, university),
    ranking: getDisplayRanking(university, profile),
    prediction,
  };
}
