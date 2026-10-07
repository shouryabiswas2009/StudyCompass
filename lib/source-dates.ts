import { RATES_SOURCE_URL } from "@/lib/exchange-rates";
import type { University } from "@/lib/types";

// "Where these figures come from, and when they were last checked", one
// line per source behind a university's page. Only dates we actually
// recorded; null means we have no date (never a guess).

export type SourceDate = {
  label: string;
  detail: string | null;
  url: string | null;
  checkedOn: string | null; // YYYY-MM-DD
};

const day = (timestamp: string | null | undefined) => (timestamp ? timestamp.slice(0, 10) : null);

export function sourcesWithDates(u: University): SourceDate[] {
  const sources: SourceDate[] = [];

  if (u.source === "College Scorecard") {
    sources.push({
      label: "College Scorecard (US Department of Education)",
      detail: u.data_year ? `data year ${u.data_year}` : null,
      url: u.source_url,
      checkedOn: day(u.fetched_at),
    });
  } else if (u.source === "curated") {
    sources.push({
      label: "The university's own website (checked by hand)",
      detail: u.data_year ? `figures for ${u.data_year}` : null,
      url: u.source_url,
      checkedOn: day(u.fetched_at),
    });
  } else if (u.source === "user-entered") {
    sources.push({ label: "Entered by you", detail: null, url: u.source_url, checkedOn: null });
  } else {
    sources.push({ label: "Illustrative sample figures", detail: "not official statistics", url: null, checkedOn: null });
  }

  if (u.tuition_currency && u.tuition_currency !== "USD" && u.fx_rate_date) {
    sources.push({
      label: "European Central Bank reference rates",
      detail: "for the US-dollar amounts",
      url: RATES_SOURCE_URL,
      checkedOn: u.fx_rate_date,
    });
  }

  if (u.research_impact) {
    sources.push({
      label: u.research_impact.source,
      detail: `research impact, papers ${u.research_impact.data_year}, ${u.research_impact.licence}`,
      url: u.research_impact.source_url,
      checkedOn: u.research_impact.checked_on,
    });
  }

  return sources;
}

// "7 October 2026"
export function formatCheckedOn(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
