// Paths for the Unicelerate strength index import. How it works and why:
// docs/STRENGTH-INDEX.md.
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

// Raw OpenAlex responses (git-ignored, re-downloadable).
export const RAW_DIR = join(ROOT, "ml", "data", "raw", "strength", "openalex");
// Committed, reviewable outputs.
export const OUT_DIR = join(ROOT, "data", "strength");
export const OPENALEX_MATCHES_CSV = join(OUT_DIR, "openalex-matches.csv");
export const OPENALEX_OVERRIDES_CSV = join(OUT_DIR, "openalex-overrides.csv");
export const OPENALEX_STATS_CSV = join(OUT_DIR, "openalex-stats.csv");
export const INDEX_CSV = join(OUT_DIR, "index.csv");
export const REPORT_MD = join(OUT_DIR, "report.md");
export const SEED_DIR = join(ROOT, "supabase", "seed_strength");
export const ROWS_PER_SQL_FILE = 300;

export const OPENALEX_API = "https://api.openalex.org/institutions";
export const OPENALEX_SOURCE = {
  name: "OpenAlex institutions",
  url: "https://openalex.org",
  licence: "CC0 1.0",
};
