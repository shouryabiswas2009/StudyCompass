// Checks data/curated/international_universities.csv before anything is
// turned into SQL. Every rule protects one honesty promise: a figure only
// gets in with the page it came from, in a sane range, once.
//
// Returns { errors, warnings }: errors stop the import; warnings don't.

export const UNIVERSITY_COLUMNS = [
  "curated_id", "name", "aliases", "country", "city", "match_existing_name", "degree_levels",
  "tuition_local", "tuition_currency", "tuition_basis", "tuition_year", "tuition_source_url",
  "living_cost_local", "living_cost_currency", "living_cost_source_url",
  "acceptance_rate", "acceptance_source_url",
  "popular_programs", "programs_source_url",
  "coop_program", "coop_source_url",
  "source_url", "data_year", "checked_on", "notes",
];

export const COOP_COLUMNS = ["key", "university", "coop_program", "source_url", "checked_on", "notes"];
export const RANKING_COLUMNS = ["university", "ranking_year", "overall_rank", "subject", "subject_rank", "source_url"];

const DEGREE_LEVELS = ["Undergraduate", "Masters", "PhD"];
const COOP_VALUES = ["mandatory", "optional", "none", "unknown"];

const isUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};
const isNumber = (v) => v !== "" && Number.isFinite(Number(v));
export const list = (v) => (v ? v.split(";").map((s) => s.trim()).filter(Boolean) : []);

export function validateUniversities(records) {
  const errors = [];
  const warnings = [];
  const seenIds = new Map();
  const seenNames = new Map();

  for (const r of records) {
    const at = `line ${r._line} (${r.name || r.curated_id || "?"})`;
    const err = (msg) => errors.push(`${at}: ${msg}`);

    // Identity
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.curated_id ?? "")) err("curated_id must be lower-case letters, digits and dashes, e.g. 'uwaterloo'");
    if (!r.name) err("name is required");
    if (!r.country) err("country is required");
    if (!r.source_url || !isUrl(r.source_url)) err("source_url must be the university's own web address (https://...)");
    if (!/^\d{4}(-\d{2})?$/.test(r.data_year ?? "")) err("data_year must look like 2025 or 2025-26");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked_on ?? "")) err("checked_on must be a date like 2026-10-06");

    // No duplicates, by id or by name + country.
    if (r.curated_id) {
      if (seenIds.has(r.curated_id)) err(`duplicate curated_id (also on line ${seenIds.get(r.curated_id)})`);
      seenIds.set(r.curated_id, r._line);
    }
    const nameKey = `${(r.name ?? "").toLowerCase()}|${(r.country ?? "").toLowerCase()}`;
    if (seenNames.has(nameKey)) err(`duplicate university (also on line ${seenNames.get(nameKey)})`);
    seenNames.set(nameKey, r._line);

    for (const level of list(r.degree_levels)) {
      if (!DEGREE_LEVELS.includes(level)) err(`unknown degree level "${level}" (use ${DEGREE_LEVELS.join("; ")})`);
    }

    // Money: an amount needs its currency, what it is, its year and its page.
    if (r.tuition_local) {
      if (!isNumber(r.tuition_local) || Number(r.tuition_local) < 0) err("tuition_local must be a number, 0 or more");
      if (!/^[A-Z]{3}$/.test(r.tuition_currency ?? "")) err("tuition_currency must be a 3-letter code like GBP");
      if (!r.tuition_basis) err("tuition_basis must say exactly what the figure is");
      if (!r.tuition_year) err("tuition_year is required with a tuition figure");
      if (!isUrl(r.tuition_source_url ?? "")) err("tuition_source_url is required with a tuition figure");
    } else if (r.tuition_currency || r.tuition_source_url) {
      warnings.push(`${at}: tuition source given but no amount — tuition will show as not available`);
    }
    if (r.living_cost_local) {
      if (!isNumber(r.living_cost_local) || Number(r.living_cost_local) < 0) err("living_cost_local must be a number, 0 or more");
      if (!/^[A-Z]{3}$/.test(r.living_cost_currency ?? "")) err("living_cost_currency must be a 3-letter code");
      if (!isUrl(r.living_cost_source_url ?? "")) err("living_cost_source_url is required with a living cost");
    }

    if (r.acceptance_rate) {
      const rate = Number(r.acceptance_rate);
      if (!isNumber(r.acceptance_rate) || rate < 0 || rate > 100) err("acceptance_rate must be a percentage from 0 to 100");
      if (!isUrl(r.acceptance_source_url ?? "")) err("acceptance_source_url is required with an acceptance rate");
    }

    if (list(r.popular_programs).length > 0 && !isUrl(r.programs_source_url ?? "")) {
      err("programs_source_url is required with a program list");
    }

    const coop = r.coop_program || "unknown";
    if (!COOP_VALUES.includes(coop)) err(`coop_program must be one of ${COOP_VALUES.join(", ")}`);
    if (coop !== "unknown" && !isUrl(r.coop_source_url ?? "")) err("coop_source_url is required unless coop_program is unknown");

    for (const field of ["tuition_source_url", "living_cost_source_url", "acceptance_source_url", "programs_source_url", "coop_source_url"]) {
      if (r[field] && !isUrl(r[field])) err(`${field} isn't a valid https:// address`);
    }
  }
  return { errors, warnings };
}

export function validateCoop(records) {
  const errors = [];
  const seen = new Map();
  for (const r of records) {
    const at = `line ${r._line} (${r.university || r.key || "?"})`;
    if (!/^(scorecard:\d+|curated:[a-z0-9-]+)$/.test(r.key ?? "")) errors.push(`${at}: key must be scorecard:<id> or curated:<curated_id>`);
    if (!["mandatory", "optional", "none"].includes(r.coop_program)) {
      errors.push(`${at}: coop_program must be mandatory, optional or none (leave unknown schools out)`);
    }
    if (!isUrl(r.source_url ?? "")) errors.push(`${at}: source_url (the school's own co-op page) is required`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked_on ?? "")) errors.push(`${at}: checked_on must be a date like 2026-10-06`);
    if (seen.has(r.key)) errors.push(`${at}: duplicate key (also on line ${seen.get(r.key)})`);
    seen.set(r.key, r._line);
  }
  return { errors, warnings: [] };
}

export function validateRankings(records) {
  const errors = [];
  for (const r of records) {
    const at = `line ${r._line} (${r.university || "?"})`;
    if (!r.university) errors.push(`${at}: university is required`);
    if (!/^\d{4}$/.test(r.ranking_year ?? "")) errors.push(`${at}: ranking_year must be a year`);
    if (r.overall_rank && !(Number.isInteger(Number(r.overall_rank)) && Number(r.overall_rank) >= 1)) errors.push(`${at}: overall_rank must be a whole number ≥ 1`);
    if (r.subject_rank && !r.subject) errors.push(`${at}: subject_rank needs a subject`);
    if (r.subject_rank && !(Number.isInteger(Number(r.subject_rank)) && Number(r.subject_rank) >= 1)) errors.push(`${at}: subject_rank must be a whole number ≥ 1`);
    if (!isUrl(r.source_url ?? "")) errors.push(`${at}: source_url (the public ranking page) is required`);
  }
  return { errors, warnings: [] };
}
