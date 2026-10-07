// Pure functions for the research-impact index: percentiles, and matching
// our universities to the Leiden Ranking. Tested in lib.test.mjs.
import { COUNTRY_ALIASES } from "./config.mjs";

// ─── Percentiles ─────────────────────────────────────────────────────────

// For each value, the share of the OTHER values that are lower, 0-100
// (ties count half). The best gets 100, the lowest 0, the middle 50.
// Returns a Map value → percentile. Fewer than two values: no comparison.
export function percentiles(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const result = new Map();
  if (n < 2) return result;
  for (let i = 0; i < n; ) {
    let j = i;
    while (j < n && sorted[j] === sorted[i]) j++;
    const below = i;
    const tiedOthers = j - i - 1;
    result.set(sorted[i], Math.round((100 * (below + tiedOthers / 2)) / (n - 1)));
    i = j;
  }
  return result;
}

// ─── Matching ────────────────────────────────────────────────────────────

// "The University of Tokyo" and "University of Tokyo", "Université" and
// "Universite", "&" and "and" compare equal.
export function normalizeName(name) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the /, "")
    .trim();
}

// The part of a web address that identifies the university:
// "https://www.ox.ac.uk/admissions" → "ox.ac.uk".
export function siteDomain(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\d?\./, "");
  } catch {
    return null;
  }
}

export function sameCountry(a, b) {
  return (COUNTRY_ALIASES[a] ?? a) === (COUNTRY_ALIASES[b] ?? b);
}

// Word overlap (Jaccard) between two names, 0-1, ignoring little words, so
// "University of Oxford" and "Oxford University" are 1. Only used to suggest
// candidates for a person to check, never to accept a match.
const LITTLE_WORDS = new Set(["of", "the", "and", "at", "in", "de", "la", "du"]);
const words = (name) => new Set(normalizeName(name).split(" ").filter((w) => !LITTLE_WORDS.has(w)));
export function nameSimilarity(a, b) {
  const wa = words(a);
  const wb = words(b);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / new Set([...wa, ...wb]).size;
}

export const SUGGEST_SIMILARITY = 0.6;

// The rules, strongest first. Only high and medium are accepted without a
// person checking; a low match is written to the CSV as a suggestion only.
//   high:   the same identifier (IPEDS id → Wikidata → ROR id), or the same
//           website domain and country
//   medium: exactly the same name (or one of our aliases) and country, and
//           no other university in that country has that name
//   low:    one of OpenAlex's other names for it (these include historical
//           names: Columbia University was once "King's College"), or a
//           similar name in the same country (word overlap ≥ 0.6)
//
// `school` = { key, name, aliases, country, website, ipedsRors }
// `leiden` = [{ ror, name, country, domain, alternatives }]
export function matchSchool(school, leiden) {
  const inCountry = leiden.filter((u) => sameCountry(u.country, school.country));
  const byRor = new Map(leiden.map((u) => [u.ror, u]));

  // IPEDS id → ROR (from Wikidata). Several RORs for one id is ambiguous.
  if (school.ipedsRors?.length === 1 && byRor.has(school.ipedsRors[0])) {
    return { leiden: byRor.get(school.ipedsRors[0]), method: "IPEDS id → Wikidata → ROR id", confidence: "high" };
  }
  if (school.ipedsRors?.length > 1) {
    const hits = school.ipedsRors.filter((r) => byRor.has(r));
    if (hits.length === 1) {
      return { leiden: byRor.get(hits[0]), method: "IPEDS id → Wikidata → ROR id (one of several)", confidence: "low" };
    }
  }

  const domain = siteDomain(school.website);
  if (domain) {
    const hits = inCountry.filter((u) => u.domain && (u.domain === domain || domain.endsWith(`.${u.domain}`)));
    if (hits.length === 1) return { leiden: hits[0], method: "website domain + country", confidence: "high" };
  }

  const names = [school.name, ...(school.aliases ?? [])].map(normalizeName).filter(Boolean);
  const exact = inCountry.filter((u) => names.includes(normalizeName(u.name)));
  if (exact.length === 1) return { leiden: exact[0], method: "same name + country", confidence: "medium" };
  const other = inCountry.filter((u) => (u.alternatives ?? []).some((n) => names.includes(normalizeName(n))));
  if (other.length === 1) return { leiden: other[0], method: "one of OpenAlex's other names + country", confidence: "low" };

  let best = null;
  for (const u of inCountry) {
    const score = Math.max(...names.map((n) => nameSimilarity(n, u.name)));
    if (score >= SUGGEST_SIMILARITY && (!best || score > best.score)) best = { u, score };
  }
  if (best) {
    return { leiden: best.u, method: `similar name + country (${best.score.toFixed(2)})`, confidence: "low" };
  }
  return null;
}

// Accepted: high and medium, unless a person said otherwise in
// overrides.csv. A low suggestion for a Leiden university that already has
// a high or medium match is dropped (it's another school with a similar
// name, e.g. "Eastern Michigan University" for the University of Michigan).
// Two high or medium matches for the same Leiden university both go back
// for review.
export function decide(matches, overrides) {
  const strong = (m) => m.confidence !== "low";
  const claims = new Map();
  for (const m of matches.filter(strong)) claims.set(m.ror, (claims.get(m.ror) ?? 0) + 1);
  const kept = matches.filter((m) => strong(m) || !claims.has(m.ror) || overrides.has(`${m.key}|${m.ror}`));
  const lowClaims = new Map();
  for (const m of kept.filter((m) => !strong(m))) lowClaims.set(m.ror, (lowClaims.get(m.ror) ?? 0) + 1);
  for (const [ror, n] of lowClaims) if (!claims.has(ror)) claims.set(ror, n);
  return kept.map((m) => {
    const override = overrides.get(`${m.key}|${m.ror}`);
    if (override) return { ...m, accepted: override.accepted, note: `reviewed: ${override.reason}` };
    if (claims.get(m.ror) > 1) return { ...m, accepted: "no", note: "another of our schools matched the same Leiden university" };
    return { ...m, accepted: m.confidence === "low" ? "no" : "yes", note: m.confidence === "low" ? "needs review" : "" };
  });
}

// The value stored in universities.research_impact. Field percentiles are
// left out when the university has too few publications in the field.
export function impactRecord({ ror, overall, fields, source, checkedOn }) {
  const record = {
    overall: overall.percentile,
    pp_top10: Math.round(overall.pp * 1000) / 1000,
    publications: Math.round(overall.p),
    fields: Object.fromEntries(Object.entries(fields).map(([key, f]) => [key, f.percentile])),
    ror,
    source: source.name,
    source_url: source.url,
    data_year: source.period,
    licence: source.licence,
    checked_on: checkedOn,
  };
  return record;
}
