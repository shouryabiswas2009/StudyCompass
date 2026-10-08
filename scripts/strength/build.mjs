// Computes the Unicelerate strength index for every shared university, at
// import time (the site only reads the stored result):
//
//   data/strength/index.csv           every school's index, tier, confidence
//   data/strength/report.md           coverage by country, lowest confidence,
//                                     correlation with Leiden
//   supabase/seed_strength/*.sql      the values, for Supabase
//
//   npm run data:strength:build
//
// Inputs (all committed): College Scorecard (data/scorecard), curated
// schools and verified rankings (data/curated), research impact
// (data/research-impact/values.json) and OpenAlex figures
// (data/strength/openalex-stats.csv, from npm run data:strength:openalex).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, toCsv } from "../curated/csv.mjs";
import { isFeatured, readCuratedIds } from "../relevance-rule.mjs";
import { computeStrength, spearman, weightedIndex } from "../../lib/strength.ts";
import { STRENGTH_WEIGHTS } from "../../lib/strength-config.ts";
import { INDEX_CSV, OPENALEX_SOURCE, OPENALEX_STATS_CSV, OUT_DIR, REPORT_MD, ROWS_PER_SQL_FILE, SEED_DIR } from "./config.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (...p) => readFileSync(join(ROOT, ...p), "utf8");

const scorecard = JSON.parse(read("data", "scorecard", "universities.json")).universities;
const curated = parseCsv(read("data", "curated", "international_universities.csv"));
const research = JSON.parse(read("data", "research-impact", "values.json"));
// Verified rankings: only those entered by hand from the ranking's public
// page (none yet); never the illustrative sample figures.
const verified = new Map(
  parseCsv(read("data", "curated", "international_rankings.csv"))
    .filter((r) => r.overall_rank && !r.subject)
    .map((r) => [r.university, Number(r.overall_rank)])
);
const openalexRows = existsSync(OPENALEX_STATS_CSV) ? parseCsv(readFileSync(OPENALEX_STATS_CSV, "utf8")) : [];
if (openalexRows.length === 0) console.warn("No OpenAlex figures yet (npm run data:strength:openalex): building without them.");
const num = (v) => (v === "" || v == null ? null : Number(v));
const openalex = new Map(
  openalexRows.map((r) => [
    r.key,
    {
      works_count: num(r.works_count),
      cited_by_count: num(r.cited_by_count),
      h_index: num(r.h_index),
      i10_index: num(r.i10_index),
      mean_citedness_2yr: num(r.mean_citedness_2yr),
    },
  ])
);
const openalexFetchedOn = openalexRows[0]?.fetched_on ?? null;
const usableOpenAlex = (key) => {
  const o = openalex.get(key);
  return o && [o.works_count, o.h_index, o.mean_citedness_2yr].every((v) => typeof v === "number") ? o : null;
};

const curatedIds = readCuratedIds();
const schools = [
  ...scorecard.map((s) => {
    const key = `scorecard:${s.scorecard_id}`;
    return {
      key,
      name: s.name,
      country: s.country,
      peerType: s.research_intensity ?? "unknown",
      graduation: s.completion_rate,
      retention: s.retention_rate,
      earnings: s.median_earnings_10yr,
      sat: s.sat_midpoint,
      carnegie: s.research_intensity,
      leiden: research[key]?.overall ?? null,
      openalex: usableOpenAlex(key),
      verifiedRank: null,
      featured: isFeatured({ ...s, source: "College Scorecard" }, curatedIds),
    };
  }),
  ...curated.map((c) => {
    const key = `curated:${c.curated_id}`;
    return {
      key,
      name: c.name,
      country: c.country,
      peerType: "university",
      leiden: research[key]?.overall ?? null,
      openalex: usableOpenAlex(key),
      verifiedRank: verified.get(c.name) ?? null,
      featured: true,
    };
  }),
];

const results = computeStrength(schools);
const byKey = new Map(schools.map((s) => [s.key, s]));
const computedOn = new Date().toISOString().slice(0, 10);

// ─── index.csv (reviewable) ──────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const rows = results
  .map((r) => ({
    key: r.key,
    name: byKey.get(r.key).name,
    country: byKey.get(r.key).country,
    featured: byKey.get(r.key).featured ? "yes" : "no",
    index: r.index,
    range: r.isEstimate ? `${r.low}-${r.high}` : "",
    tier: r.tier,
    confidence: r.confidence,
    estimate: r.isEstimate ? "yes" : "no",
    position: r.isEstimate ? `${r.positionRange[0]}-${r.positionRange[1]}` : r.position,
    signals: Object.keys(r.signals).join(" "),
  }))
  .sort((a, b) => b.index - a.index || a.name.localeCompare(b.name));
writeFileSync(INDEX_CSV, toCsv(Object.keys(rows[0]), rows));

// ─── SQL, in chunks like the other imports ───────────────────────────────
const sqlText = (s) => `'${s.replaceAll("'", "''")}'`;
const where = (key) => {
  const [kind, id] = key.split(":");
  return kind === "scorecard" ? `scorecard_id = ${Number(id)}` : `curated_id = ${sqlText(id)}`;
};
const sqlNum = (v) => (v === null ? "null" : String(v));
const statements = results.map((r) => {
  const details = {
    signals: r.signals,
    of: r.of,
    computed_on: computedOn,
    ...(openalexFetchedOn && r.signals.openalex ? { openalex_fetched_on: openalexFetchedOn } : {}),
    ...(r.isEstimate ? { peer_group: r.peerGroup, peer_count: r.peerCount, position_range: r.positionRange } : {}),
  };
  return (
    `update public.universities set strength_index = ${r.index}, strength_low = ${sqlNum(r.low)}, strength_high = ${sqlNum(r.high)}, ` +
    `strength_tier = '${r.tier}', strength_confidence = '${r.confidence}', strength_is_estimate = ${r.isEstimate}, ` +
    `strength_position = ${r.position}, strength_signals = ${sqlText(JSON.stringify(details))}::jsonb ` +
    `where created_by is null and ${where(r.key)};`
  );
});
if (existsSync(SEED_DIR)) for (const f of readdirSync(SEED_DIR)) rmSync(join(SEED_DIR, f));
mkdirSync(SEED_DIR, { recursive: true });
const files = Math.ceil(statements.length / ROWS_PER_SQL_FILE);
for (let i = 0; i < files; i++) {
  const chunk = statements.slice(i * ROWS_PER_SQL_FILE, (i + 1) * ROWS_PER_SQL_FILE);
  writeFileSync(
    join(SEED_DIR, `${String(i + 1).padStart(2, "0")}_strength.sql`),
    [
      `-- Unicelerate strength index, part ${i + 1} of ${files} (${chunk.length} universities)`,
      "-- Generated by scripts/strength/build.mjs. Do not edit by hand.",
      `-- Our own estimate from open data (College Scorecard, Leiden Ranking Open Edition, ${OPENALEX_SOURCE.name}), not an official ranking.`,
      "-- Run after migration_019_strength_index.sql, files in order. Safe to re-run.",
      "",
      "begin;",
      ...chunk,
      "commit;",
      "",
    ].join("\n")
  );
}

// ─── Report ──────────────────────────────────────────────────────────────
const result = new Map(results.map((r) => [r.key, r]));
const countries = new Map();
for (const s of schools) {
  const c = countries.get(s.country) ?? { total: 0, featured: 0, High: 0, Medium: 0, Low: 0, estimates: 0 };
  const r = result.get(s.key);
  c.total++;
  if (s.featured) c.featured++;
  c[r.confidence]++;
  if (r.isEstimate) c.estimates++;
  countries.set(s.country, c);
}
const countryRows = [...countries.entries()].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));
const totals = countryRows.reduce(
  (t, [, c]) => ({ total: t.total + c.total, featured: t.featured + c.featured, High: t.High + c.High, Medium: t.Medium + c.Medium, Low: t.Low + c.Low, estimates: t.estimates + c.estimates }),
  { total: 0, featured: 0, High: 0, Medium: 0, Low: 0, estimates: 0 }
);
const featuredWithIndex = schools.filter((s) => s.featured && typeof result.get(s.key).index === "number").length;
const featuredEstimates = schools.filter((s) => s.featured && result.get(s.key).isEstimate);

// Correlation with Leiden, where both exist. Also without the Leiden signal
// inside the index, so the number isn't just Leiden agreeing with itself.
const both = results.filter((r) => r.signals.leiden);
const withoutLeiden = (r) => weightedIndex(Object.fromEntries(Object.entries(r.signals).filter(([k]) => k !== "leiden")));
const independent = both.filter((r) => withoutLeiden(r) !== null);
const corr = (list, x, y) => (list.length > 2 ? spearman(list.map(x), list.map(y)).toFixed(2) : "n/a");
const usBoth = independent.filter((r) => r.key.startsWith("scorecard:"));
const nonUsBoth = independent.filter((r) => r.key.startsWith("curated:"));

const lowest = results
  .filter((r) => r.confidence === "Low" && byKey.get(r.key).featured)
  .map((r) => ({ ...r, s: byKey.get(r.key) }))
  .sort((a, b) => a.s.country.localeCompare(b.s.country) || a.s.name.localeCompare(b.s.name));

const md = [
  "# Unicelerate strength index: coverage and checks",
  "",
  `Generated by \`npm run data:strength:build\` on ${computedOn}. Our own estimate from open data, not an official ranking; how it works: docs/STRENGTH-INDEX.md.`,
  "",
  `Every one of our ${totals.total} shared universities has an index (${totals.total - totals.estimates} measured, ${totals.estimates} estimated from similar schools). Featured schools with an index: ${featuredWithIndex} of ${totals.featured} (${featuredEstimates.length} of them estimated).`,
  openalexRows.length === 0 ? "\n**Built without OpenAlex figures** (not downloaded yet).\n" : `OpenAlex figures for ${openalexRows.length} schools (fetched ${openalexFetchedOn}); ${results.filter((r) => r.signals.openalex).length} have enough works (see lib/strength-config.ts) to count.`,
  "",
  "## Coverage by country and confidence",
  "",
  "| Country | Universities | Featured | High | Medium | Low | Estimated |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...countryRows.map(([country, c]) => `| ${country} | ${c.total} | ${c.featured} | ${c.High} | ${c.Medium} | ${c.Low} | ${c.estimates} |`),
  `| **All** | **${totals.total}** | **${totals.featured}** | **${totals.High}** | **${totals.Medium}** | **${totals.Low}** | **${totals.estimates}** |`,
  "",
  "## How the index agrees with the Leiden research-impact percentile",
  "",
  "Spearman rank correlation (1 = same order, 0 = unrelated), schools that have both:",
  "",
  `- Index vs Leiden percentile: **${corr(both, (r) => r.index, (r) => r.signals.leiden.percentile)}** (n = ${both.length}). Leiden is one of the index's inputs, so this overstates agreement.`,
  `- Index **without** its Leiden signal vs Leiden percentile: **${corr(independent, withoutLeiden, (r) => r.signals.leiden.percentile)}** (n = ${independent.length}): how far the other signals agree independently.`,
  `  - US schools (Scorecard outcomes + OpenAlex + Carnegie): ${corr(usBoth, withoutLeiden, (r) => r.signals.leiden.percentile)} (n = ${usBoth.length})`,
  `  - Outside the US (OpenAlex only): ${corr(nonUsBoth, withoutLeiden, (r) => r.signals.leiden.percentile)} (n = ${nonUsBoth.length})`,
  "",
  "## Featured schools with low confidence",
  "",
  lowest.length === 0
    ? "None."
    : [
        "Fill these by hand through the curated CSVs (data/curated/) where a figure can be verified on an official page.",
        "",
        "| University | Country | Index | Why |",
        "| --- | --- | --- | --- |",
        ...lowest.map((r) => `| ${r.s.name} | ${r.s.country} | ${r.isEstimate ? `est. ${r.low}–${r.high}` : r.index} | ${r.isEstimate ? `estimated from ${r.peerCount} similar schools (${r.peerGroup}); signals of its own: ${Object.keys(r.signals).join(", ") || "none"}` : "few signals"} |`),
      ].join("\n"),
  "",
  "## Weights",
  "",
  Object.entries(STRENGTH_WEIGHTS).map(([k, w]) => `${k} ${w}`).join(" · "),
  "",
].join("\n");
writeFileSync(REPORT_MD, md);

console.log(`Index for ${results.length} schools: ${totals.High} High, ${totals.Medium} Medium, ${totals.Low} Low (${totals.estimates} estimates).`);
console.log(`Featured with an index: ${featuredWithIndex} of ${totals.featured}.`);
console.log(`Wrote ${INDEX_CSV}, ${REPORT_MD}, ${files} SQL files in ${SEED_DIR}`);
