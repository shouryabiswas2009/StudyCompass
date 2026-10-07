// Downloads the open data for the research-impact index ONCE into
// ml/data/raw/research-impact/ (git-ignored), so nothing calls these
// services while the site runs:
//
//   1. CWTS Leiden Ranking Open Edition 2025 (CC0 1.0) from Zenodo, then
//      keeps only the rows we use (2020–2023, core publications, fractional
//      counting, all six fields) in extract.json.
//   2. Wikidata (CC0 1.0): which ROR id belongs to which IPEDS id (the id
//      College Scorecard uses), for matching US schools.
//   3. OpenAlex institutions (CC0 1.0), only those in the Leiden Ranking:
//      website, other names and Wikidata id, for matching the rest.
//
//   npm run data:research-impact:download              # skips what's there
//   npm run data:research-impact:download -- --refresh # downloads again
//
// No key needed: Zenodo and Wikidata are open, and ~60 OpenAlex requests
// are well within its free keyless use.
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import ExcelJS from "exceljs";
import { FIELDS, INDICATOR, LEIDEN_DIR, LEIDEN_DOWNLOADS, LEIDEN_EXTRACT, OPENALEX_FILE, SOURCE, WIKIDATA_FILE } from "./config.mjs";

const refresh = process.argv.includes("--refresh");
const USER_AGENT = "Unicelerate/1.0 (https://www.unicelerate.com; one-off open-data download)";
const need = (file) => refresh || !existsSync(file);

async function download(url, file) {
  mkdirSync(dirname(file), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
}

// 1. Leiden Ranking files, then the rows we use.
for (const [name, url] of Object.entries(LEIDEN_DOWNLOADS)) {
  const file = join(LEIDEN_DIR, name);
  if (need(file)) {
    console.log(`Downloading ${name}…`);
    await download(url, file);
  }
}

if (need(LEIDEN_EXTRACT)) {
  console.log("Reading Results.xlsx (a few minutes: it has every field, period and counting method)…");
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(join(LEIDEN_DIR, "Results.xlsx"), {
    sharedStrings: "cache",
    worksheets: "emit",
    hyperlinks: "ignore",
    styles: "ignore",
  });
  const rows = [];
  for await (const sheet of reader) {
    if (sheet.name !== "Results") continue;
    let col = null;
    for await (const row of sheet) {
      const v = row.values; // 1-based
      if (!col) {
        col = {};
        v.forEach((name, i) => (col[name] = i)); // forEach skips the empty index 0
        for (const name of ["University", "ROR_ID", "Country", "Field", "Period", "Core_pubs_only", "Frac_counting", "P", INDICATOR]) {
          if (!(name in col)) throw new Error(`Results.xlsx has no column ${name}`);
        }
        continue;
      }
      if (v[col.Period] !== SOURCE.period || v[col.Core_pubs_only] !== 1 || v[col.Frac_counting] !== 1) continue;
      if (!(v[col.Field] in FIELDS)) continue;
      rows.push({
        ror: v[col.ROR_ID],
        name: v[col.University],
        country: v[col.Country],
        field: v[col.Field],
        p: v[col.P],
        pp: v[col[INDICATOR]],
      });
    }
  }
  if (rows.length === 0) throw new Error(`No rows for period ${SOURCE.period}: has the file's layout changed?`);
  writeFileSync(LEIDEN_EXTRACT, JSON.stringify(rows));
  console.log(`Kept ${rows.length} rows (${new Set(rows.map((r) => r.ror)).size} universities).`);
}
const leiden = JSON.parse(readFileSync(LEIDEN_EXTRACT, "utf8"));
const rors = [...new Set(leiden.map((r) => r.ror))];

// 2. Wikidata: IPEDS id → ROR id.
if (need(WIKIDATA_FILE)) {
  console.log("Asking Wikidata for IPEDS ↔ ROR ids…");
  const query = "SELECT ?item ?ipeds ?ror WHERE { ?item wdt:P1771 ?ipeds; wdt:P6782 ?ror. }";
  await download(`https://query.wikidata.org/sparql?format=csv&query=${encodeURIComponent(query)}`, WIKIDATA_FILE);
}

// 3. OpenAlex: the Leiden universities' websites and other names, 50 at a time.
if (need(OPENALEX_FILE)) {
  console.log(`Asking OpenAlex about ${rors.length} institutions…`);
  const select = "id,ror,display_name,display_name_alternatives,country_code,homepage_url,ids";
  const institutions = [];
  for (let i = 0; i < rors.length; i += 50) {
    const filter = rors.slice(i, i + 50).map((r) => `https://ror.org/${r}`).join("|");
    const url = `https://api.openalex.org/institutions?filter=ror:${filter}&select=${select}&per_page=50`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`OpenAlex → ${res.status}`);
    institutions.push(...(await res.json()).results);
    await new Promise((r) => setTimeout(r, 200));
  }
  mkdirSync(dirname(OPENALEX_FILE), { recursive: true });
  writeFileSync(OPENALEX_FILE, JSON.stringify(institutions));
  console.log(`OpenAlex knew ${institutions.length} of ${rors.length}.`);
}
console.log("Done. Next: npm run data:research-impact:build");
