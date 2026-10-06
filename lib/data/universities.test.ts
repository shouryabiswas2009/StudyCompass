import { describe, expect, it } from "vitest";
import scorecard from "../../data/scorecard/universities.json";
import { LIST_COLUMNS, MAX_ROWS_PER_REQUEST, fetchAllRows } from "./universities";
import { DETAIL_ONLY_FIELDS, type University } from "@/lib/types";

// Regression guards for the slowness and the missing-schools bug measured
// in docs/PERFORMANCE.md.

// A fake API that, like Supabase, never returns more than 1,000 rows.
function cappedSource(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: [number, number][] = [];
  const fetchRange = async (from: number, to: number) => {
    calls.push([from, to]);
    const end = Math.min(to + 1, from + MAX_ROWS_PER_REQUEST, total);
    return { data: rows.slice(from, end), error: null };
  };
  return { fetchRange, calls };
}

describe("fetchAllRows", () => {
  it("gets every row past the 1,000-row API limit (1,624 schools, not 1,000)", async () => {
    const { fetchRange, calls } = cappedSource(1624);
    const rows = await fetchAllRows(fetchRange);
    expect(rows).toHaveLength(1624);
    expect(new Set(rows.map((r) => r.id)).size).toBe(1624); // no repeats
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("makes one extra request when the total is an exact multiple of the page size", async () => {
    const { fetchRange, calls } = cappedSource(2000);
    expect(await fetchAllRows(fetchRange)).toHaveLength(2000);
    expect(calls).toHaveLength(3); // the third, empty page says "no more"
  });

  it("fails loudly instead of returning a partial list", async () => {
    const failing = async () => ({ data: null, error: { message: "boom" } });
    await expect(fetchAllRows(failing)).rejects.toThrow("boom");
  });
});

describe("LIST_COLUMNS", () => {
  it("selects exactly the fields of UniversitySummary", () => {
    // Required<University> makes TypeScript insist on every field, so a new
    // column added to the type can't be forgotten here.
    const everyField: Required<University> = {
      id: "", name: "", country: "", tuition: 0, qs_ranking: null, program_rankings: {},
      degree_levels: [], acceptance_rate: 0, avg_admitted_gpa: null, sat_25: null, sat_75: null,
      min_ielts: null, living_cost_per_year: null, popular_programs: [], description: "",
      created_by: null, created_at: "", source: "illustrative", data_year: null, fetched_at: null,
      source_url: null, scorecard_id: null, city: null, state: null, ownership: null, us_region: null,
      tuition_in_state: null, avg_net_price: null, student_size: null, completion_rate: null,
      median_earnings_10yr: null, research_intensity: null, retention_rate: null,
      coop_program: "unknown", internship_support_url: null, is_featured: false,
    };
    const summaryFields = Object.keys(everyField).filter(
      (f) => !(DETAIL_ONLY_FIELDS as readonly string[]).includes(f)
    );
    expect([...LIST_COLUMNS].sort()).toEqual(summaryFields.sort());
  });

  it("keeps the cached list well under Next.js's 2 MB data-cache limit", () => {
    // What the cache would hold for every imported school, list columns only.
    const rows = scorecard.universities.map((u) =>
      Object.fromEntries(
        LIST_COLUMNS.map((c) => [c, (u as Record<string, unknown>)[c] ?? null])
      )
    );
    const bytes = new TextEncoder().encode(JSON.stringify(rows)).length;
    expect(bytes).toBeLessThan(1.5 * 1024 * 1024);
  });
});
