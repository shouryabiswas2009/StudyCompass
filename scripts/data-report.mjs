// Prints where the data has gaps: for each country, how many universities
// there are and how many have each kind of figure. It builds the database
// in memory from the same SQL files you run in Supabase (seed, migrations,
// seed_scorecard, seed_international, featured), so it reports exactly what
// the live database will hold — without a network connection.
//
//   npm run data:report
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInMemoryDb } from "./in-memory-db.mjs";

const SUPABASE = join(import.meta.dirname, "..", "supabase");
const { db } = await createInMemoryDb();
for (const dir of ["seed_scorecard", "seed_international"]) {
  const path = join(SUPABASE, dir);
  if (!existsSync(path)) continue;
  for (const f of readdirSync(path).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(path, f), "utf8"));
  }
}
await db.exec(readFileSync(join(SUPABASE, "featured", "featured.sql"), "utf8"));

// "Verified" = from College Scorecard or checked by hand (curated) — never
// the illustrative sample figures.
const { rows } = await db.query(`
  select
    country,
    count(*)::int as schools,
    count(*) filter (where is_featured)::int as featured,
    count(*) filter (where source = 'College Scorecard')::int as scorecard,
    count(*) filter (where source = 'curated')::int as curated,
    count(*) filter (where source = 'illustrative')::int as illustrative,
    count(*) filter (where source in ('College Scorecard', 'curated') and tuition is not null)::int as tuition,
    count(*) filter (where source in ('College Scorecard', 'curated') and living_cost_per_year is not null)::int as living,
    count(*) filter (where source in ('College Scorecard', 'curated') and acceptance_rate is not null)::int as admission,
    count(*) filter (where source in ('College Scorecard', 'curated') and cardinality(popular_programs) > 0)::int as programs,
    count(*) filter (where coop_program <> 'unknown')::int as coop,
    count(*) filter (where source = 'curated' and (qs_ranking is not null or program_rankings <> '{}'::jsonb))::int as ranked,
    count(*) filter (where source_url is not null)::int as source_url
  from public.universities
  where created_by is null
  group by country
  order by count(*) desc, country
`);

const columns = [
  ["country", "Country"],
  ["schools", "Schools"],
  ["featured", "Featured"],
  ["scorecard", "Scorecard"],
  ["curated", "Curated"],
  ["illustrative", "Illustr."],
  ["tuition", "Tuition✓"],
  ["living", "Living✓"],
  ["admission", "Admit✓"],
  ["programs", "Programs✓"],
  ["coop", "Co-op known"],
  ["ranked", "Ranked✓"],
  ["source_url", "Source URL"],
];
const totals = Object.fromEntries(columns.map(([k]) => [k, k === "country" ? "TOTAL" : rows.reduce((s, r) => s + r[k], 0)]));
const table = [...rows, totals];
const widths = columns.map(([k, label]) => Math.max(label.length, ...table.map((r) => String(r[k]).length)));
const line = (cells) => cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join("  ");

console.log(line(columns.map(([, label]) => label)));
console.log(widths.map((w) => "-".repeat(w)).join("  "));
for (const r of table) console.log(line(columns.map(([k]) => r[k])));
console.log(`
✓ = verified: from College Scorecard or checked by hand on the university's
own site (curated). Illustrative sample figures are never counted.
"Ranked✓" counts only rankings you entered in international_rankings.csv.
Scorecard has no rankings; the 14 original sample US schools keep their
illustrative QS rankings, which are labeled illustrative and not counted.`);
