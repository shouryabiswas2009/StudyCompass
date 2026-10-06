// Checks data/curated/country_info.csv and turns it into SQL.
// Used by build-country-info-sql.mjs and its tests.
//
// The rule that matters most: a figure is only allowed with a source page
// on an official (government) website and the date it was checked. Anything
// else stays empty and the app shows "not available".

export const COUNTRY_INFO_COLUMNS = [
  "country",
  "post_study_text", "post_study_months", "post_study_source_url", "post_study_checked_on",
  "funds_text", "funds_amount", "funds_currency", "funds_period", "funds_source_url", "funds_checked_on",
  "work_text", "work_hours_per_week", "work_source_url", "work_checked_on",
  "notes",
];

// Government websites. A host counts as official when it ends in one of
// these government suffixes…
const GOVERNMENT_SUFFIXES = [
  ".gov", ".gov.uk", ".gov.au", ".govt.nz", ".gov.hk", ".gov.sg", ".gov.it", ".gov.in", ".gov.my",
  ".gov.tw", ".gov.cn", ".gov.ae", ".go.jp", ".go.kr", ".gouv.fr", ".admin.ch", ".gob.es", ".gv.at",
  ".gc.ca", ".belgium.be",
];
// …or is one of these national agencies whose domain doesn't say "gov".
// Each one is the government body for immigration or international
// students in that country.
const OFFICIAL_HOSTS = [
  "canada.ca",            // Government of Canada (IRCC)
  "irishimmigration.ie",  // Irish Immigration Service Delivery (Department of Justice)
  "ind.nl",               // Dutch Immigration and Naturalisation Service
  "campusfrance.org",     // French government agency for international students
  "bamf.de",              // German Federal Office for Migration and Refugees
  "auswaertiges-amt.de",  // German Federal Foreign Office
  "migrationsverket.se",  // Swedish Migration Agency
  "migri.fi",             // Finnish Immigration Service
  "nyidanmark.dk",        // Danish Agency for International Recruitment and Integration
  "udi.no",               // Norwegian Directorate of Immigration
];

export function isOfficialUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  const matches = (domain) => host === domain || host.endsWith(`.${domain}`);
  return OFFICIAL_HOSTS.some(matches) || GOVERNMENT_SUFFIXES.some((s) => matches(s.slice(1)));
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "") && !Number.isNaN(Date.parse(v));
const isNumber = (v) => v !== "" && v != null && Number.isFinite(Number(v));

// The three figures, each a group of columns that travel together.
const GROUPS = [
  { name: "post_study", text: "post_study_text", number: "post_study_months", min: 0, max: 120 },
  { name: "funds", text: "funds_text", number: "funds_amount", min: 0, max: Infinity },
  { name: "work", text: "work_text", number: "work_hours_per_week", min: 0, max: 60 },
];

// `requiredCountries`: every country that has schools in the app; each must
// have a row (even if all its figures are empty).
export function validateCountryInfo(records, requiredCountries = []) {
  const errors = [];
  const seen = new Map();
  for (const r of records) {
    const at = `line ${r._line} (${r.country || "?"})`;
    const err = (msg) => errors.push(`${at}: ${msg}`);

    if (!r.country) err("country is required");
    else if (seen.has(r.country)) err(`duplicate country (also on line ${seen.get(r.country)})`);
    else seen.set(r.country, r._line);

    for (const g of GROUPS) {
      const text = r[g.text];
      const number = r[g.number];
      const url = r[`${g.name}_source_url`];
      const checked = r[`${g.name}_checked_on`];
      if (!text && !number) {
        if (url || checked) err(`${g.name}: a source or date without a figure — add the figure or clear them`);
        continue;
      }
      if (!text) err(`${g.text} is required with ${g.number} (say what the rule is in words)`);
      if (number && (!isNumber(number) || Number(number) < g.min || Number(number) > g.max)) {
        err(`${g.number} must be a number from ${g.min} to ${g.max}`);
      }
      if (!url) err(`${g.name}_source_url is required with a figure`);
      else if (!isOfficialUrl(url)) err(`${g.name}_source_url must be an https page on an official government website, got ${url}`);
      if (!isDate(checked)) err(`${g.name}_checked_on must be a date like 2026-10-06`);
    }

    if (r.funds_amount) {
      if (!/^[A-Z]{3}$/.test(r.funds_currency ?? "")) err("funds_currency must be a 3-letter code like GBP");
      if (!["month", "year"].includes(r.funds_period)) err('funds_period must be "month" or "year"');
    }
  }
  for (const country of requiredCountries) {
    if (!seen.has(country)) errors.push(`missing a row for ${country} (it has schools in the app)`);
  }
  return { errors };
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "null";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

const num = (v) => (v === "" || v == null ? null : Number(v));

// One idempotent upsert for all rows. Every column is overwritten, so a
// figure removed from the CSV becomes null in the database too.
export function countryInfoSql(records) {
  const columns = COUNTRY_INFO_COLUMNS;
  const numeric = new Set(["post_study_months", "funds_amount", "work_hours_per_week"]);
  const values = records.map((r) => {
    const cells = columns.map((c) => {
      if (numeric.has(c)) return sql(num(r[c]));
      if (c.endsWith("_checked_on") && r[c]) return `${sql(r[c])}::date`;
      return sql(r[c]);
    });
    return `  (${cells.join(", ")})`;
  });
  const updates = [...columns.slice(1), "updated_at"].map((c) =>
    c === "updated_at" ? "  updated_at = now()" : `  ${c} = excluded.${c}`
  );
  return [
    `insert into public.country_info (${columns.join(", ")})`,
    "values",
    values.join(",\n"),
    "on conflict (country) do update set",
    updates.join(",\n") + ";",
    "",
  ].join("\n");
}
