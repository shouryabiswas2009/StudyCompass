// Settings for the "Research impact (Leiden Ranking / OpenAlex)" index.
// How it works and why: docs/RESEARCH-IMPACT.md.
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

// Downloads (git-ignored, re-downloadable) and the committed outputs.
export const RAW_DIR = join(ROOT, "ml", "data", "raw", "research-impact");
export const LEIDEN_DIR = join(RAW_DIR, "leiden-2025");
export const LEIDEN_EXTRACT = join(LEIDEN_DIR, "extract.json");
export const WIKIDATA_FILE = join(RAW_DIR, "wikidata", "ipeds_ror.csv");
export const OPENALEX_FILE = join(RAW_DIR, "openalex", "institutions.json");
export const OUT_DIR = join(ROOT, "data", "research-impact");
export const MATCHES_CSV = join(OUT_DIR, "matches.csv");
export const OVERRIDES_CSV = join(OUT_DIR, "overrides.csv");
export const COVERAGE_MD = join(OUT_DIR, "coverage.md");
export const VALUES_JSON = join(OUT_DIR, "values.json");
export const SEED_SQL = join(ROOT, "supabase", "seed_research_impact.sql");

// CWTS Leiden Ranking Open Edition 2025 (CC0 1.0), on Zenodo.
// https://open.leidenranking.com/resources
const ZENODO = "https://zenodo.org/api/records/17473224/files";
const FILE = (name) => `${ZENODO}/${encodeURIComponent(`CWTS Leiden Ranking Open Edition 2025 - ${name}.xlsx`)}/content`;
export const LEIDEN_DOWNLOADS = {
  "Universities.xlsx": FILE("Universities"),
  "Main fields.xlsx": FILE("Main fields"),
  "Results.xlsx": FILE("Results"), // 589 MB
};

// What each stored row says about where it comes from.
export const SOURCE = {
  name: "CWTS Leiden Ranking Open Edition 2025",
  url: "https://doi.org/10.5281/zenodo.17473224",
  licence: "CC0 1.0",
  // The ranking's most recent four-year publication window.
  period: "2020–2023",
};

// Leiden's default view: core publications, fractional counting. The
// indicator is PP(top 10%): the share of a university's publications that
// are among the 10% most cited in their field and year.
export const INDICATOR = "PP_top_10";

// Leiden's field names → the short keys stored in the database (short to
// keep the cached university list small).
export const FIELDS = {
  "All sciences": "overall",
  "Biomedical and health sciences": "biomedical",
  "Life and earth sciences": "life_earth",
  "Mathematics and computer science": "math_cs",
  "Physical sciences and engineering": "physical_eng",
  "Social sciences and humanities": "social_humanities",
};

// Our rule, not Leiden's: a field percentile is only given when the
// university has at least this many (fractionally counted) publications in
// that field. With fewer, one or two highly cited papers swing the share a
// lot. Every university in the ranking has at least 1,500 publications
// overall (Leiden's own inclusion rule), so the overall figure always counts.
export const MIN_FIELD_PUBLICATIONS = 100;

// Leiden lists universities in Hong Kong and Macao under "China"; ours
// keep their own country name.
export const COUNTRY_ALIASES = { "Hong Kong": "China", Macau: "China", Macao: "China" };
