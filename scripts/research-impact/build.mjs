// Builds the research-impact index from the downloaded open data
// (npm run data:research-impact:download first):
//
//   data/research-impact/matches.csv   every proposed match, for review
//   data/research-impact/coverage.md   how many of our schools have a value
//   supabase/seed_research_impact.sql  the accepted values, for Supabase
//
//   npm run data:research-impact:build
//
// To correct a match, add a line to data/research-impact/overrides.csv
// (key,ror,accepted,reason) and run this again.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, toCsv } from "../curated/csv.mjs";
import {
  COVERAGE_MD,
  FIELDS,
  LEIDEN_EXTRACT,
  MATCHES_CSV,
  MIN_FIELD_PUBLICATIONS,
  OPENALEX_FILE,
  OUT_DIR,
  OVERRIDES_CSV,
  SEED_SQL,
  SOURCE,
  WIKIDATA_FILE,
} from "./config.mjs";
import { decide, impactRecord, matchSchool, percentiles, siteDomain } from "./lib.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
for (const file of [LEIDEN_EXTRACT, OPENALEX_FILE, WIKIDATA_FILE]) {
  if (!existsSync(file)) {
    console.error(`Missing ${file}. Run npm run data:research-impact:download first.`);
    process.exit(1);
  }
}

// ─── Leiden: one entry per university, with percentiles per field ───────
const rows = JSON.parse(readFileSync(LEIDEN_EXTRACT, "utf8"));
// The date the data was downloaded: "data last checked" on the site.
const checkedOn = statSync(LEIDEN_EXTRACT).mtime.toISOString().slice(0, 10);

const percentileOf = {}; // field key → Map(value → percentile)
for (const [field, key] of Object.entries(FIELDS)) {
  const counted = rows.filter((r) => r.field === field && typeof r.pp === "number" && (key === "overall" || r.p >= MIN_FIELD_PUBLICATIONS));
  percentileOf[key] = percentiles(counted.map((r) => r.pp));
}

const universities = new Map();
for (const r of rows) {
  if (!universities.has(r.ror)) universities.set(r.ror, { ror: r.ror, name: r.name, country: r.country, overall: null, fields: {} });
  const u = universities.get(r.ror);
  const key = FIELDS[r.field];
  if (typeof r.pp !== "number") continue;
  if (key === "overall") u.overall = { percentile: percentileOf.overall.get(r.pp), pp: r.pp, p: r.p };
  else if (r.p >= MIN_FIELD_PUBLICATIONS) u.fields[key] = { percentile: percentileOf[key].get(r.pp) };
}
const rankedCount = [...universities.values()].filter((u) => u.overall).length;

// OpenAlex adds each university's website and other names (for matching).
const openalex = new Map(JSON.parse(readFileSync(OPENALEX_FILE, "utf8")).map((i) => [i.ror?.replace("https://ror.org/", ""), i]));
const leiden = [...universities.values()].map((u) => {
  const o = openalex.get(u.ror);
  return { ...u, domain: siteDomain(o?.homepage_url), alternatives: o?.display_name_alternatives ?? [] };
});

// ─── Our schools ─────────────────────────────────────────────────────────
const ipedsRors = new Map();
for (const r of parseCsv(readFileSync(WIKIDATA_FILE, "utf8"))) {
  const id = String(Number(r.ipeds));
  if (!ipedsRors.has(id)) ipedsRors.set(id, new Set());
  ipedsRors.get(id).add(r.ror);
}
const scorecard = JSON.parse(readFileSync(join(ROOT, "data", "scorecard", "universities.json"), "utf8")).universities;
const curated = parseCsv(readFileSync(join(ROOT, "data", "curated", "international_universities.csv"), "utf8"));
const schools = [
  ...scorecard.map((s) => ({
    key: `scorecard:${s.scorecard_id}`,
    name: s.name,
    country: s.country,
    ipedsRors: [...(ipedsRors.get(String(s.scorecard_id)) ?? [])],
  })),
  ...curated.map((c) => ({
    key: `curated:${c.curated_id}`,
    name: c.name,
    aliases: c.aliases ? c.aliases.split(";").map((a) => a.trim()) : [],
    country: c.country,
    website: c.source_url,
  })),
];

// ─── Match, then apply reviews ───────────────────────────────────────────
const overrides = new Map();
if (existsSync(OVERRIDES_CSV)) {
  for (const o of parseCsv(readFileSync(OVERRIDES_CSV, "utf8"))) overrides.set(`${o.key}|${o.ror}`, o);
}
const proposed = [];
for (const school of schools) {
  const m = matchSchool(school, leiden);
  if (!m) continue;
  proposed.push({
    key: school.key,
    our_name: school.name,
    our_country: school.country,
    ror: m.leiden.ror,
    leiden_name: m.leiden.name,
    leiden_country: m.leiden.country,
    method: m.method,
    confidence: m.confidence,
  });
}
const RANK = { no: 0, yes: 1 };
const decided = decide(proposed, overrides).sort(
  (a, b) => RANK[a.accepted] - RANK[b.accepted] || a.our_country.localeCompare(b.our_country) || a.our_name.localeCompare(b.our_name)
);
mkdirSync(OUT_DIR, { recursive: true });
const header = ["key", "our_name", "our_country", "ror", "leiden_name", "leiden_country", "method", "confidence", "accepted", "note"];
writeFileSync(MATCHES_CSV, toCsv(header, decided));

// ─── SQL ─────────────────────────────────────────────────────────────────
const accepted = decided.filter((m) => m.accepted === "yes");
const sqlText = (s) => `'${s.replaceAll("'", "''")}'`;
const where = (key) => {
  const [kind, id] = key.split(":");
  return kind === "scorecard" ? `scorecard_id = ${Number(id)}` : `curated_id = ${sqlText(id)}`;
};
const sql = [
  "-- Unicelerate: Research impact (Leiden Ranking / OpenAlex)",
  "-- Generated by scripts/research-impact/build.mjs. Do not edit by hand.",
  `-- Source: ${SOURCE.name} (${SOURCE.licence}), ${SOURCE.url}`,
  `-- Publications ${SOURCE.period}; indicator PP(top 10%), core publications, fractional counting.`,
  `-- Percentiles compare each university with all ${rankedCount} universities in the ranking.`,
  `-- Matches reviewed in data/research-impact/matches.csv (${accepted.length} accepted). Data checked ${checkedOn}.`,
  "-- Run after migration_015_research_impact.sql. Safe to re-run.",
  "",
  "begin;",
  "update public.universities set research_impact = null where created_by is null and research_impact is not null;",
  ...accepted.map((m) => {
    const u = universities.get(m.ror);
    const record = impactRecord({ ror: m.ror, overall: u.overall, fields: u.fields, source: SOURCE, checkedOn });
    return `update public.universities set research_impact = ${sqlText(JSON.stringify(record))}::jsonb where created_by is null and ${where(m.key)};`;
  }),
  "commit;",
  "",
].join("\n");
writeFileSync(SEED_SQL, sql);

// ─── Coverage by country ─────────────────────────────────────────────────
const byCountry = new Map();
for (const s of schools) {
  if (!byCountry.has(s.country)) byCountry.set(s.country, { schools: 0, covered: 0, review: 0 });
  byCountry.get(s.country).schools++;
}
const rejected = (m) => m.accepted === "no" && m.note.startsWith("reviewed:");
const review = decided.filter((m) => m.accepted === "no" && !rejected(m));
for (const m of decided) {
  if (m.accepted === "yes") byCountry.get(m.our_country).covered++;
  else if (!rejected(m)) byCountry.get(m.our_country).review++;
}
const countries = [...byCountry.entries()].sort((a, b) => b[1].schools - a[1].schools || a[0].localeCompare(b[0]));
const pct = (a, b) => `${Math.round((100 * a) / b)}%`;
const table = (list, why) => [
  `| Our university | Leiden Ranking university | ${why} |`,
  "| --- | --- | --- |",
  ...list.map((m) => `| ${m.our_name} (${m.our_country}) | ${m.leiden_name} (${m.leiden_country}) | ${m.method}; ${m.note.replace(/^reviewed: /, "")} |`),
].join("\n");
const md = [
  "# Research impact: coverage",
  "",
  `Generated by \`npm run data:research-impact:build\` from ${SOURCE.name} (${SOURCE.licence}), publications ${SOURCE.period}, data checked ${checkedOn}.`,
  "",
  `${accepted.length} of our ${schools.length} shared universities have a research-impact value (${pct(accepted.length, schools.length)}). The rest aren't in the Leiden Ranking (it only includes universities with at least 1,500 publications in 2020–2023), or their match is waiting for review.`,
  "",
  "| Country | Our universities | With research impact | Coverage | Waiting for review |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...countries.map(([c, v]) => `| ${c} | ${v.schools} | ${v.covered} | ${pct(v.covered, v.schools)} | ${v.review || ""} |`),
  "",
  "## Matches waiting for review",
  "",
  review.length === 0
    ? "None."
    : `Not used until accepted in \`overrides.csv\` (\`key,ror,accepted,reason\`).\n\n${table(review, "Why it's uncertain")}`,
  "",
  "## Suggestions rejected after review",
  "",
  "Listed in `overrides.csv` with the reason; never used.",
  "",
  table(decided.filter(rejected), "Reason"),
  "",
].join("\n");
writeFileSync(COVERAGE_MD, md);

console.log(`Leiden: ${universities.size} universities (${rankedCount} with an overall value).`);
console.log(`Matches: ${decided.length} proposed, ${accepted.length} accepted, ${review.length} waiting for review, ${decided.filter(rejected).length} rejected after review.`);
const counts = decided.reduce((acc, m) => ((acc[`${m.confidence}/${m.accepted}`] = (acc[`${m.confidence}/${m.accepted}`] ?? 0) + 1), acc), {});
console.log("By confidence/accepted:", counts);
console.log(`Wrote ${MATCHES_CSV}, ${COVERAGE_MD}, ${SEED_SQL}`);
