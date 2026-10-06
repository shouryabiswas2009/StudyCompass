// Downloads every school matching FILTERS from the College Scorecard API and
// caches the raw pages in ml/data/raw/scorecard/ (git-ignored), so later
// steps can re-run without hitting the API again.
//
//   npm run data:fetch-scorecard              # uses the cache if present
//   npm run data:fetch-scorecard -- --refresh # re-downloads everything
//
// Needs SCORECARD_API_KEY (free from https://api.data.gov/signup/) in
// .env.local or the environment.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { API_URL, FIELDS, FILTERS, YEAR_PROBE_SCHOOL_ID } from "./config.mjs";
import { detectDataYear } from "./normalize-lib.mjs";

const CACHE_DIR = join(import.meta.dirname, "..", "..", "ml", "data", "raw", "scorecard");
const PER_PAGE = 100; // the API's maximum
const PAUSE_MS = 400; // between requests; the limit is 1,000 per hour
const MAX_RETRIES = 5;
const YEAR_METRIC = "admissions.admission_rate.overall";

const apiKey = process.env.SCORECARD_API_KEY;
if (!apiKey) {
  console.error("SCORECARD_API_KEY is not set. Get a free key at https://api.data.gov/signup/ and add it to .env.local.");
  process.exit(1);
}
const refresh = process.argv.includes("--refresh");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl(params) {
  const query = new URLSearchParams({ ...params, keys_nested: "true", api_key: apiKey });
  return `${API_URL}?${query}`;
}

// GET with retries: on "too many requests" (429) or a server error (5xx),
// wait 1s, 2s, 4s, ... before trying again. The URL contains the API key,
// so it's never printed.
async function getJson(params, label) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(buildUrl(params));
    if (response.ok) return response.json();

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`${label}: HTTP ${response.status} ${response.statusText}`);
    }
    const wait = 1000 * 2 ** attempt;
    console.log(`${label}: HTTP ${response.status}, retrying in ${wait / 1000}s`);
    await sleep(wait);
  }
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const metaPath = join(CACHE_DIR, "meta.json");

  if (!refresh && existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    console.log(`Using cached download from ${meta.fetched_at} (${meta.total} schools). Pass --refresh to re-download.`);
    return;
  }

  // Which Scorecard data year "latest" currently refers to.
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);
  const probe = await getJson(
    {
      id: String(YEAR_PROBE_SCHOOL_ID),
      fields: [`latest.${YEAR_METRIC}`, ...years.map((y) => `${y}.${YEAR_METRIC}`)].join(","),
    },
    "data-year probe"
  );
  const dataYear = detectDataYear(probe.results[0], YEAR_METRIC, years);
  if (!dataYear) throw new Error("Couldn't work out which data year 'latest' refers to.");

  const fetchedAt = new Date().toISOString();
  let page = 0;
  let total = Infinity;
  while (page * PER_PAGE < total) {
    const data = await getJson(
      { ...FILTERS, fields: FIELDS.join(","), per_page: String(PER_PAGE), page: String(page) },
      `page ${page}`
    );
    total = data.metadata.total;
    writeFileSync(join(CACHE_DIR, `page-${String(page).padStart(3, "0")}.json`), JSON.stringify(data.results));
    console.log(`page ${page + 1} of ${Math.ceil(total / PER_PAGE)}: ${data.results.length} schools`);
    page++;
    await sleep(PAUSE_MS);
  }

  writeFileSync(
    metaPath,
    JSON.stringify({ fetched_at: fetchedAt, data_year: dataYear, total, pages: page, filters: FILTERS }, null, 2)
  );
  console.log(`Done: ${total} schools, Scorecard data year ${dataYear}, cached in ml/data/raw/scorecard/`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
