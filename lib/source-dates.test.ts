import { describe, expect, it } from "vitest";
import { formatCheckedOn, sourcesWithDates } from "@/lib/source-dates";
import type { University } from "@/lib/types";

const u = (fields: Partial<University>) => ({ source: "College Scorecard", data_year: null, fetched_at: null, source_url: null, ...fields }) as University;

describe("sourcesWithDates", () => {
  it("dates a Scorecard school by when it was fetched", () => {
    expect(sourcesWithDates(u({ data_year: "2024", fetched_at: "2026-10-06T13:27:54.954Z", source_url: "https://collegescorecard.ed.gov/school/?100654" }))).toEqual([
      { label: "College Scorecard (US Department of Education)", detail: "data year 2024", url: "https://collegescorecard.ed.gov/school/?100654", checkedOn: "2026-10-06" },
    ]);
  });

  it("adds the exchange rate for curated money and research impact when present", () => {
    const sources = sourcesWithDates(
      u({
        source: "curated",
        data_year: "2027-28",
        fetched_at: "2026-10-06T00:00:00Z",
        source_url: "https://www.ox.ac.uk",
        tuition_currency: "GBP",
        fx_rate_date: "2026-10-05",
        research_impact: {
          overall: 99, pp_top10: 0.18, publications: 19249, fields: {}, ror: "052gg0110",
          source: "CWTS Leiden Ranking Open Edition 2025", source_url: "https://doi.org/10.5281/zenodo.17473224",
          data_year: "2020–2023", licence: "CC0 1.0", checked_on: "2026-10-07",
        },
      })
    );
    expect(sources.map((s) => [s.label, s.checkedOn])).toEqual([
      ["The university's own website (checked by hand)", "2026-10-06"],
      ["European Central Bank reference rates", "2026-10-05"],
      ["CWTS Leiden Ranking Open Edition 2025", "2026-10-07"],
    ]);
  });

  it("has no date where none was recorded", () => {
    expect(sourcesWithDates(u({ source: "user-entered" }))[0].checkedOn).toBeNull();
    expect(sourcesWithDates(u({ source: "illustrative" }))[0].checkedOn).toBeNull();
    // US-dollar tuition needs no exchange rate line.
    expect(sourcesWithDates(u({ tuition_currency: "USD", fx_rate_date: "2026-10-05" }))).toHaveLength(1);
  });
});

describe("formatCheckedOn", () => {
  it("writes the date out", () => {
    expect(formatCheckedOn("2026-10-07")).toBe("7 October 2026");
  });
});
