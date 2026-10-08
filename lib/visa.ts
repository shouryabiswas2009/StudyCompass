import type { CountryInfo } from "@/lib/country-info";
import { toUsd } from "@/lib/exchange-rates";
import { usd } from "@/lib/format";
import {
  POST_STUDY_CAP_MONTHS,
  STAY_UNSURE_POST_STUDY_SHARE,
  VISA_PART_WEIGHTS,
  WORK_HOURS_CAP,
} from "@/lib/scoring-config";
import type { Profile } from "@/lib/types";

// "Visa and work rights": an optional factor the student controls
// (profiles.visa_mode, migration_020):
//   ignore (default): no effect anywhere
//   show:   a visa line on cards, compare and offers, scores unchanged
//   factor: also a scoring factor (lib/matching.ts, lib/ranking.ts, offers)
//
// visaFit uses ONLY the cited figures in country_info. It never rates a
// country as easy or hard, and it doesn't know the student's nationality,
// so everything it says is general guidance.

export const VISA_MODES = ["ignore", "show", "factor"] as const;
export type VisaMode = (typeof VISA_MODES)[number];
export const VISA_WEIGHTS = ["low", "medium", "high"] as const;
export const STAY_AFTER = ["yes", "unsure", "no"] as const;
export type StayAfter = (typeof STAY_AFTER)[number];

export const VISA_MODE_LABELS: Record<VisaMode, string> = {
  ignore: "Ignore it",
  show: "Show it, don't score it",
  factor: "Factor it in",
};
export const STAY_AFTER_LABELS: Record<StayAfter, string> = {
  yes: "Yes, probably",
  unsure: "Not sure",
  no: "No, I'll return home",
};

export type VisaPart = { key: keyof typeof VISA_PART_WEIGHTS; label: string; value: number; weight: number };

export type VisaFit = {
  score: number | null; // 0..1, null when nothing is known
  parts: VisaPart[];
  reasons: string[]; // neutral, factual strengths
  concerns: string[]; // neutral, factual concerns
  notes: string[]; // how to read it
};

export function visaModeOf(profile: Pick<Profile, "visa_mode"> | null): VisaMode {
  return profile?.visa_mode ?? "ignore";
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const months = (m: number) => (m % 12 === 0 && m >= 12 ? `${m / 12}-year` : `${m}-month`);

export function visaFit(
  profile: Pick<Profile, "budget_max" | "stay_after">,
  info: CountryInfo | null,
  cost: { tuition: number | null }
): VisaFit {
  const parts: VisaPart[] = [];
  const reasons: string[] = [];
  const concerns: string[] = [];
  const notes = [
    "General guidance, not legal advice: rules can differ by nationality.",
    // See docs/DATA-SOURCES-CONSIDERED.md: official rates exist for a few
    // countries but vary by nationality, which we don't ask for.
    "No refusal-rate figure shown: official rates vary by nationality.",
  ];

  // 1. Post-study work window, unless the student plans to go home.
  const window = info?.post_study_months ?? null;
  if (window !== null) {
    if (profile.stay_after === "no") {
      notes.push("You plan to return home, so the post-study work window isn't counted.");
    } else {
      const share = profile.stay_after === "unsure" ? STAY_UNSURE_POST_STUDY_SHARE : 1;
      parts.push({ key: "postStudy", label: "Post-study work window", value: clamp01(window / POST_STUDY_CAP_MONTHS), weight: VISA_PART_WEIGHTS.postStudy * share });
      (window >= 18 ? reasons : concerns).push(window >= 18 ? `${months(window)} post-study work window` : `Shorter post-study work window (${months(window)})`);
    }
  }

  // 2. Proof of funds for living costs, per month, against what the budget
  //    leaves after tuition (tuition has to be paid either way, so this
  //    holds whether or not the rule adds tuition on top).
  const required = info?.funds_amount != null && info.funds_currency && info.funds_period ? toUsd(info.funds_amount, info.funds_currency) : null;
  if (required !== null && required > 0 && cost.tuition !== null) {
    const requiredMonthly = info!.funds_period === "year" ? required / 12 : required;
    const availableMonthly = Math.max(0, profile.budget_max - cost.tuition) / 12;
    parts.push({ key: "funds", label: "Proof of funds vs your budget", value: clamp01(availableMonthly / requiredMonthly), weight: VISA_PART_WEIGHTS.funds });
    if (availableMonthly < requiredMonthly) {
      concerns.push(
        `Required funds are above your budget: about ${usd(Math.round(requiredMonthly))}/month to show, your budget leaves about ${usd(Math.round(availableMonthly))}/month after tuition`
      );
    } else {
      reasons.push("Your budget covers the proof-of-funds requirement");
    }
  }

  // 3. Work allowed during study (0 is a real figure: no work allowed).
  const hours = info?.work_hours_per_week ?? null;
  if (hours !== null) {
    parts.push({ key: "work", label: "Work allowed during study", value: clamp01(hours / WORK_HOURS_CAP), weight: VISA_PART_WEIGHTS.work });
    if (hours === 0) concerns.push("No work allowed during study");
    else if (hours < 20) concerns.push(`Less time to work during study (${hours} hours a week)`);
    else reasons.push(`Up to ${hours} hours of work a week during study`);
  }

  const weight = parts.reduce((s, p) => s + p.weight, 0);
  const score = weight > 0 ? parts.reduce((s, p) => s + p.weight * p.value, 0) / weight : null;
  return { score, parts, reasons, concerns, notes };
}

// The one-line visa note on cards: the cited figures, or "not available".
export function visaLine(info: CountryInfo | null): string {
  if (!info) return "Visa information not available";
  const bits = [
    info.post_study_months !== null ? `${months(info.post_study_months)} post-study work` : null,
    info.work_hours_per_week !== null ? `${info.work_hours_per_week} h/week work in study` : null,
    info.funds_amount !== null && info.funds_currency ? `funds ${info.funds_currency} ${info.funds_amount.toLocaleString("en-US")}/${info.funds_period}` : null,
  ].filter(Boolean);
  return bits.length ? `Visa: ${bits.join(" · ")}` : "Visa information not available";
}
