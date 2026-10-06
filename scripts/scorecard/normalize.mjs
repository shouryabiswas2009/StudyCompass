// Turns the cached raw Scorecard pages into data/scorecard/universities.json:
// one clean row per school, each with its source, data year and fetch time.
//
//   npm run data:normalize-scorecard
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeSchool } from "./normalize-lib.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const CACHE_DIR = join(ROOT, "ml", "data", "raw", "scorecard");
const OUT_DIR = join(ROOT, "data", "scorecard");

const meta = JSON.parse(readFileSync(join(CACHE_DIR, "meta.json"), "utf8"));
const raw = readdirSync(CACHE_DIR)
  .filter((f) => /^page-\d+\.json$/.test(f))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(CACHE_DIR, f), "utf8")));

const rows = [];
let skipped = 0;
for (const school of raw) {
  const row = normalizeSchool(school, { dataYear: meta.data_year, fetchedAt: meta.fetched_at });
  if (row) rows.push(row);
  else skipped++;
}
// Stable order, so a refresh only shows real changes in a diff.
rows.sort((a, b) => a.scorecard_id - b.scorecard_id);

const count = (key) => rows.filter((r) => r[key] !== null && !(Array.isArray(r[key]) && r[key].length === 0)).length;
const coverage = {
  schools: rows.length,
  skipped_no_tuition: skipped,
  with_sat_range: count("sat_25"),
  with_living_cost: count("living_cost_per_year"),
  with_programs: count("popular_programs"),
  with_median_earnings: count("median_earnings_10yr"),
  with_completion_rate: count("completion_rate"),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "universities.json"),
  JSON.stringify(
    {
      source: "US Department of Education College Scorecard (https://collegescorecard.ed.gov/)",
      data_year: meta.data_year,
      fetched_at: meta.fetched_at,
      filters: meta.filters,
      coverage,
      universities: rows,
    },
    null,
    1
  ) + "\n"
);

console.log(`Wrote ${rows.length} schools to data/scorecard/universities.json (data year ${meta.data_year})`);
console.log("Coverage:", JSON.stringify(coverage));
