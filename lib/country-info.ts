// Visa and post-study work guidance per destination country (table
// country_info, migration_012). Pure helpers for showing it; loading is in
// lib/data/country-info.ts.
//
// Every figure was copied from a government page, which is linked, with the
// date it was checked. Rules change, so the app always shows how old the
// check is and says it's guidance only.

export type CountryInfo = {
  country: string;
  post_study_text: string | null;
  post_study_months: number | null;
  post_study_source_url: string | null;
  post_study_checked_on: string | null;
  funds_text: string | null;
  funds_amount: number | null;
  funds_currency: string | null;
  funds_period: "month" | "year" | null;
  funds_source_url: string | null;
  funds_checked_on: string | null;
  work_text: string | null;
  work_hours_per_week: number | null;
  work_source_url: string | null;
  work_checked_on: string | null;
  notes: string | null;
};

// A check older than this gets a "may be out of date" warning.
export const STALE_AFTER_DAYS = 180;

export type CheckAge = { days: number; label: string; stale: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

// "checked 3 days ago", from a date like "2026-10-06". Days are counted
// between calendar dates (UTC), so the label doesn't flip at odd hours.
export function checkAge(checkedOn: string, today: Date = new Date()): CheckAge | null {
  const checked = Date.parse(`${checkedOn}T00:00:00Z`);
  if (Number.isNaN(checked)) return null;
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Math.max(0, Math.round((todayUtc - checked) / DAY_MS));
  let label: string;
  if (days === 0) label = "checked today";
  else if (days === 1) label = "checked yesterday";
  else if (days < 31) label = `checked ${days} days ago`;
  else if (days < 365) {
    const months = Math.floor(days / 30);
    label = `checked ${months} month${months === 1 ? "" : "s"} ago`;
  } else label = "checked over a year ago";
  return { days, label, stale: days > STALE_AFTER_DAYS };
}

export type GuidanceItem = {
  key: "post_study" | "funds" | "work";
  title: string;
  // Short figure for the headline ("18 months", "£1,171 / month", "20 h / week"),
  // or null when only the wording is known.
  headline: string | null;
  text: string | null; // null = not available
  sourceUrl: string | null;
  checkedOn: string | null;
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`; // an unknown currency code
  }
}

function duration(months: number): string {
  if (months % 12 === 0 && months >= 12) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} month${months === 1 ? "" : "s"}`;
}

// The three figures in display order. A missing figure keeps its slot and
// shows "Not available", so students see what we don't know.
export function guidanceItems(info: CountryInfo | null): GuidanceItem[] {
  return [
    {
      key: "post_study",
      title: "Stay after graduating",
      headline: info?.post_study_months != null ? duration(info.post_study_months) : null,
      text: info?.post_study_text ?? null,
      sourceUrl: info?.post_study_source_url ?? null,
      checkedOn: info?.post_study_checked_on ?? null,
    },
    {
      key: "funds",
      title: "Proof of funds",
      headline:
        info?.funds_amount != null && info.funds_currency && info.funds_period
          ? `${money(info.funds_amount, info.funds_currency)} / ${info.funds_period}`
          : null,
      text: info?.funds_text ?? null,
      sourceUrl: info?.funds_source_url ?? null,
      checkedOn: info?.funds_checked_on ?? null,
    },
    {
      key: "work",
      title: "Work while studying",
      headline: info?.work_hours_per_week != null ? `${info.work_hours_per_week} h / week` : null,
      text: info?.work_text ?? null,
      sourceUrl: info?.work_source_url ?? null,
      checkedOn: info?.work_checked_on ?? null,
    },
  ];
}

// The oldest check among the figures that are filled in, for one summary
// line ("Oldest check: 3 months ago").
export function oldestCheck(info: CountryInfo | null, today: Date = new Date()): CheckAge | null {
  const ages = guidanceItems(info)
    .filter((item) => item.text && item.checkedOn)
    .map((item) => checkAge(item.checkedOn!, today))
    .filter((age): age is CheckAge => age !== null);
  if (ages.length === 0) return null;
  return ages.reduce((oldest, age) => (age.days > oldest.days ? age : oldest));
}
