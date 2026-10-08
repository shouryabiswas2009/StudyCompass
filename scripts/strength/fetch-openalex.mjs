// Fetches OpenAlex citation figures (CC0) for our universities ONCE, at
// import time; the site never calls OpenAlex.
//
//   npm run data:strength:openalex              # uses cached responses
//   npm run data:strength:openalex -- --refresh # asks OpenAlex again
//
// Needs OPENALEX_EMAIL (your contact email, for OpenAlex's "polite pool")
// in .env.local or the environment. It's sent only to OpenAlex and never
// printed. Matching reuses scripts/research-impact/lib.mjs and its review
// rules:
//   - US schools: IPEDS id → Wikidata → ROR id → OpenAlex (high)
//   - other schools: the ROR id of their accepted Leiden match
//   - the rest: OpenAlex's name search within the country, then the same
//     name rules (exact name = medium; similar = low, never used until
//     accepted in data/strength/openalex-overrides.csv)
// Writes data/strength/openalex-matches.csv (every proposed match) and
// data/strength/openalex-stats.csv (figures for accepted matches).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, toCsv } from "../curated/csv.mjs";
import { decide, matchSchool, siteDomain } from "../research-impact/lib.mjs";
import { WIKIDATA_FILE } from "../research-impact/config.mjs";
import { countryCode } from "../../lib/countries.ts";
import { OPENALEX_API, OPENALEX_MATCHES_CSV, OPENALEX_OVERRIDES_CSV, OPENALEX_STATS_CSV, OUT_DIR, RAW_DIR } from "./config.mjs";

const email = process.env.OPENALEX_EMAIL;
if (!email) {
  console.error("OPENALEX_EMAIL is not set. Add your contact email to .env.local (OPENALEX_EMAIL=...) and run again.");
  process.exit(1);
}
const refresh = process.argv.includes("--refresh");
const ROOT = join(import.meta.dirname, "..", "..");
const SELECT = "id,ror,display_name,display_name_alternatives,country_code,homepage_url,works_count,cited_by_count,summary_stats";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One cached request. The cache file is named by what was asked, so a
// changed question is asked again. Errors never print the URL (it carries
// the email address).
async function cached(name, params) {
  const file = join(RAW_DIR, `${name}.json`);
  if (!refresh && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const query = new URLSearchParams({ ...params, select: SELECT, mailto: email });
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${OPENALEX_API}?${query}`, { headers: { "User-Agent": "Unicelerate/1.0 (https://www.unicelerate.com)" } });
    if (res.ok) {
      const data = await res.json();
      mkdirSync(RAW_DIR, { recursive: true });
      writeFileSync(file, JSON.stringify(data));
      await sleep(150);
      return data;
    }
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`OpenAlex answered ${res.status} for ${name}`);
    await sleep(2000 * attempt);
  }
}
const hash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 12);
const shortId = (id) => id.replace("https://openalex.org/", "");
const shortRor = (ror) => ror?.replace("https://ror.org/", "") ?? null;

// ─── Our schools and the ROR ids we already trust ────────────────────────
const scorecard = JSON.parse(readFileSync(join(ROOT, "data", "scorecard", "universities.json"), "utf8")).universities;
const curated = parseCsv(readFileSync(join(ROOT, "data", "curated", "international_universities.csv"), "utf8"));
const ipedsRors = new Map();
for (const r of parseCsv(readFileSync(WIKIDATA_FILE, "utf8"))) {
  const id = String(Number(r.ipeds));
  if (!ipedsRors.has(id)) ipedsRors.set(id, new Set());
  ipedsRors.get(id).add(r.ror);
}
const leidenMatches = new Map(
  parseCsv(readFileSync(join(ROOT, "data", "research-impact", "matches.csv"), "utf8"))
    .filter((m) => m.accepted === "yes")
    .map((m) => [m.key, m])
);

const schools = [
  ...scorecard.map((s) => {
    const rors = [...(ipedsRors.get(String(s.scorecard_id)) ?? [])];
    return {
      key: `scorecard:${s.scorecard_id}`,
      name: s.name,
      country: s.country,
      ror: rors.length === 1 ? rors[0] : null,
      rorMethod: "IPEDS id → Wikidata → ROR id",
      rorConfidence: "high",
    };
  }),
  ...curated.map((c) => {
    const leiden = leidenMatches.get(`curated:${c.curated_id}`);
    return {
      key: `curated:${c.curated_id}`,
      name: c.name,
      aliases: c.aliases ? c.aliases.split(";").map((a) => a.trim()) : [],
      country: c.country,
      website: c.source_url,
      ror: leiden?.ror ?? null,
      rorMethod: `ROR id of the accepted Leiden match (${leiden?.method ?? ""})`,
      rorConfidence: leiden?.confidence ?? null,
    };
  }),
];

// ─── 1. By ROR id, 50 per request ("ror:a|b|c") ──────────────────────────
const rors = [...new Set(schools.map((s) => s.ror).filter(Boolean))].sort();
const byRor = new Map();
console.log(`OpenAlex: ${rors.length} institutions by ROR id…`);
for (let i = 0; i < rors.length; i += 50) {
  const batch = rors.slice(i, i + 50);
  const data = await cached(`ror-${hash(batch.join("|"))}`, {
    filter: `ror:${batch.map((r) => `https://ror.org/${r}`).join("|")}`,
    per_page: "50",
  });
  for (const inst of data.results) byRor.set(shortRor(inst.ror), inst);
}

// ─── 2. Name search for the rest, within the country ─────────────────────
const institutions = new Map(); // OpenAlex id → institution
const proposed = [];
const searchFor = schools.filter((s) => !s.ror || !byRor.has(s.ror));
console.log(`OpenAlex: name search for ${searchFor.length} schools…`);
for (const s of schools) {
  const inst = s.ror ? byRor.get(s.ror) : null;
  if (inst) {
    institutions.set(shortId(inst.id), inst);
    proposed.push({ key: s.key, our_name: s.name, our_country: s.country, ror: shortId(inst.id), openalex_name: inst.display_name, method: s.rorMethod, confidence: s.rorConfidence });
    continue;
  }
  const code = countryCode(s.country);
  if (!code) continue;
  const data = await cached(`search-${hash(`${s.name}|${code}`)}`, {
    search: s.name,
    filter: `country_code:${code.toUpperCase()}`,
    per_page: "10",
  });
  const candidates = data.results.map((inst) => ({
    ror: shortId(inst.id),
    name: inst.display_name,
    country: s.country,
    domain: siteDomain(inst.homepage_url),
    alternatives: inst.display_name_alternatives ?? [],
    inst,
  }));
  const m = matchSchool({ name: s.name, aliases: s.aliases, country: s.country, website: s.website }, candidates);
  if (!m) continue;
  institutions.set(m.leiden.ror, m.leiden.inst);
  proposed.push({ key: s.key, our_name: s.name, our_country: s.country, ror: m.leiden.ror, openalex_name: m.leiden.name, method: `OpenAlex name search: ${m.method}`, confidence: m.confidence });
}

// ─── 3. Review rules, then write ─────────────────────────────────────────
const overrides = new Map();
if (existsSync(OPENALEX_OVERRIDES_CSV)) {
  for (const o of parseCsv(readFileSync(OPENALEX_OVERRIDES_CSV, "utf8"))) overrides.set(`${o.key}|${o.openalex_id}`, o);
}
const decided = decide(proposed, overrides).map(({ ror, ...rest }) => ({ ...rest, openalex_id: ror }));
mkdirSync(OUT_DIR, { recursive: true });
const order = { no: 0, yes: 1 };
decided.sort((a, b) => order[a.accepted] - order[b.accepted] || a.our_country.localeCompare(b.our_country) || a.our_name.localeCompare(b.our_name));
writeFileSync(
  OPENALEX_MATCHES_CSV,
  toCsv(["key", "our_name", "our_country", "openalex_id", "openalex_name", "method", "confidence", "accepted", "note"], decided)
);

const fetchedOn = new Date().toISOString().slice(0, 10);
const stats = decided
  .filter((m) => m.accepted === "yes")
  .map((m) => {
    const inst = institutions.get(m.openalex_id);
    return {
      key: m.key,
      openalex_id: m.openalex_id,
      works_count: inst.works_count,
      cited_by_count: inst.cited_by_count,
      h_index: inst.summary_stats?.h_index ?? "",
      i10_index: inst.summary_stats?.i10_index ?? "",
      mean_citedness_2yr: inst.summary_stats?.["2yr_mean_citedness"] ?? "",
      fetched_on: fetchedOn,
    };
  })
  .sort((a, b) => a.key.localeCompare(b.key));
writeFileSync(
  OPENALEX_STATS_CSV,
  toCsv(["key", "openalex_id", "works_count", "cited_by_count", "h_index", "i10_index", "mean_citedness_2yr", "fetched_on"], stats)
);
const counts = decided.reduce((acc, m) => ((acc[`${m.confidence}/${m.accepted}`] = (acc[`${m.confidence}/${m.accepted}`] ?? 0) + 1), acc), {});
console.log(`Matched ${decided.length} of ${schools.length}; accepted ${stats.length}.`, counts);
console.log("Next: npm run data:strength:build");
