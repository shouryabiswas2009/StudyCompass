// Which shared universities are "featured": shown by default on
// recommendations, browse and the compare picker. Nothing is deleted; every
// other school is one click away ("Include all N schools").
//
// Why: the College Scorecard import takes every US school that mainly awards
// bachelor's degrees and publishes an admission rate (1,577 of them), which
// includes many small, local and open-admission colleges that few
// international students would consider. Without a rule, US schools crowd
// out every other country.
//
// THE THRESHOLDS LIVE HERE. Change them, run `npm run data:featured`, then
// run the regenerated supabase/featured/featured.sql in the SQL Editor.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const RELEVANCE_RULE = {
  // Carnegie research levels that count (R1 and R2).
  researchLevels: ["very_high", "high"],
  // A 75th-percentile SAT (Reading + Math) at or above this counts. 1400
  // keeps ~100 selective non-research colleges (e.g. liberal arts colleges)
  // on top of R1/R2. Counts for other values are in the README.
  minSat75: 1400,
  // A school with any known ranking counts.
  includeRanked: true,
};

// Hand-picked US schools to feature regardless of the rule above (one row
// per school: scorecard_id,name,reason). Edit the CSV, not this file.
export const CURATED_CSV = join(import.meta.dirname, "..", "data", "curated", "featured_us.csv");

export function readCuratedIds(path = CURATED_CSV) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/).slice(1); // skip the header
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const id = Number(line.split(",")[0]);
      if (!Number.isInteger(id) || id <= 0) throw new Error(`featured_us.csv: bad scorecard_id in "${line}"`);
      return id;
    });
}

// The rule for one row, in JavaScript (used for counts and tests). Rows that
// aren't from College Scorecard (hand-picked illustrative or curated
// schools) are always featured. Must agree with featuredSql() below; a test
// checks that both give the same count.
export function isFeatured(row, curatedIds = []) {
  if (row.source && row.source !== "College Scorecard") return true;
  return (
    RELEVANCE_RULE.researchLevels.includes(row.research_intensity) ||
    (typeof row.sat_75 === "number" && row.sat_75 >= RELEVANCE_RULE.minSat75) ||
    (RELEVANCE_RULE.includeRanked && row.qs_ranking != null) ||
    curatedIds.includes(row.scorecard_id)
  );
}

// The same rule as one SQL update over the shared rows (students' own
// schools are always shown to them, so they're left alone).
export function featuredSql(curatedIds = []) {
  const levels = RELEVANCE_RULE.researchLevels.map((l) => `'${l}'`).join(", ");
  const ranked = RELEVANCE_RULE.includeRanked ? "\n  or qs_ranking is not null" : "";
  // coalesce(..., false): in SQL "null in (...)" is null, not false, so a
  // school with no research level would otherwise get a null flag.
  return `update public.universities set is_featured = coalesce(
  source <> 'College Scorecard'
  or research_intensity in (${levels})
  or coalesce(sat_75, 0) >= ${RELEVANCE_RULE.minSat75}${ranked}
  or scorecard_id = any(array[${curatedIds.join(", ")}]::integer[]),
  false
)
where created_by is null;
`;
}
