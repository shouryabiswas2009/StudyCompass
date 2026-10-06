// Pure functions that turn one raw College Scorecard record (keys_nested
// JSON) into one row for the app. No network or file access here, so it's
// unit-tested in normalize-lib.test.mjs.
//
// The rule throughout: if Scorecard doesn't have a figure, the row gets
// null — never an estimate.
import { CARNEGIE_RESEARCH, OWNERSHIP, PROGRAM_LABELS, REGIONS } from "./config.mjs";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Reads a dotted path ("latest.cost.tuition.in_state") from nested JSON.
export function get(obj, path) {
  return path.split(".").reduce((o, key) => (o == null ? undefined : o[key]), obj);
}

const pct = (rate) => (isNum(rate) ? Math.round(rate * 1000) / 10 : null);

// Scorecard reports SAT Reading and Math percentiles separately. Adding the
// two 25th (or 75th) percentiles only approximates the total-score range,
// so the app labels it that way. Null unless all four numbers exist.
export function satRange(sat) {
  const r25 = get(sat, "25th_percentile.critical_reading");
  const r75 = get(sat, "75th_percentile.critical_reading");
  const m25 = get(sat, "25th_percentile.math");
  const m75 = get(sat, "75th_percentile.math");
  if (![r25, r75, m25, m75].every(isNum)) return { sat_25: null, sat_75: null };
  return { sat_25: r25 + m25, sat_75: r75 + m75 };
}

export function satMidpoint(sat) {
  const r = get(sat, "midpoint.critical_reading");
  const m = get(sat, "midpoint.math");
  return isNum(r) && isNum(m) ? r + m : null;
}

// The school's biggest fields of study (by share of degrees awarded), as the
// app's major names. Tiny fields are skipped so "popular" means popular.
export function topPrograms(programPercentage, count = 4, minShare = 0.03) {
  if (!programPercentage) return [];
  return Object.entries(programPercentage)
    .filter(([key, share]) => isNum(share) && share >= minShare && PROGRAM_LABELS[key])
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => PROGRAM_LABELS[key]);
}

// Scorecard credential levels (field-of-study data) → the app's levels.
// 3 = bachelor's, 5 = master's, 6 = doctoral degree. Other levels
// (certificates, associate degrees, first-professional degrees) don't map
// to a level the app offers, so they're ignored.
const CREDENTIAL_LEVELS = { 3: "Undergraduate", 5: "Masters", 6: "PhD" };

// Which degree levels a school awards, from the programs it reports. If it
// reports none, fall back to the summary field: a bachelor's-highest school
// is undergraduate-only; otherwise the levels stay unknown ([]) rather than
// the app claiming degrees that might not exist.
export function degreeLevels(highest, programs) {
  const levels = new Set(
    (programs ?? []).map((p) => CREDENTIAL_LEVELS[get(p, "credential.level")]).filter(Boolean)
  );
  if (levels.size > 0) return ["Undergraduate", "Masters", "PhD"].filter((l) => levels.has(l));
  return highest === 3 ? ["Undergraduate"] : [];
}

// Official cost-of-attendance parts for students living on campus. Only
// added up when both are known, so a partial cost never looks complete.
export function livingCost(roomBoard, otherExpenses) {
  return isNum(roomBoard) && isNum(otherExpenses) ? roomBoard + otherExpenses : null;
}

// Carnegie basic code → the app's research_intensity. Unclassified → null.
export function researchIntensity(code) {
  if (!isNum(code) || code <= 0) return null;
  return CARNEGIE_RESEARCH[code] ?? "non_doctoral";
}

// Which Scorecard year `latest` is: the newest year-specific value equal to
// the latest one. Uses a metric that changes year to year (admission rate),
// because a value like tuition can repeat across several years.
export function detectDataYear(record, metric, years) {
  const latest = get(record, `latest.${metric}`);
  if (!isNum(latest)) return null;
  const match = [...years].sort((a, b) => b - a).find((y) => get(record, `${y}.${metric}`) === latest);
  return match === undefined ? null : String(match);
}

function describe(ownership, city, state) {
  const kind = ownership ? ownership.charAt(0).toUpperCase() + ownership.slice(1) : "A";
  const place = [city, state].filter(Boolean).join(", ");
  return place ? `${kind} university in ${place}.` : `${kind} university.`;
}

// One raw Scorecard record → one app row, or null if it can't be used
// (no tuition at all — the app can't score a school without a cost).
export function normalizeSchool(raw, { dataYear, fetchedAt }) {
  const sat = get(raw, "latest.admissions.sat_scores");
  const outOfState = get(raw, "latest.cost.tuition.out_of_state");
  const inState = get(raw, "latest.cost.tuition.in_state");
  // International students pay the out-of-state rate at public universities.
  const tuition = isNum(outOfState) ? outOfState : isNum(inState) ? inState : null;
  if (tuition === null) return null;

  const ownership = OWNERSHIP[get(raw, "school.ownership")] ?? null;
  const city = get(raw, "school.city") ?? null;
  const state = get(raw, "school.state") ?? null;
  const netPublic = get(raw, "latest.cost.avg_net_price.public");
  const netPrivate = get(raw, "latest.cost.avg_net_price.private");

  return {
    scorecard_id: raw.id,
    name: get(raw, "school.name"),
    country: "United States",
    city,
    state,
    ownership,
    us_region: REGIONS[get(raw, "school.region_id")] ?? null,
    tuition,
    tuition_in_state: isNum(inState) ? inState : null,
    avg_net_price: isNum(netPublic) ? netPublic : isNum(netPrivate) ? netPrivate : null,
    acceptance_rate: pct(get(raw, "latest.admissions.admission_rate.overall")),
    ...satRange(sat),
    sat_midpoint: satMidpoint(sat),
    avg_admitted_gpa: null, // Scorecard has no GPA data
    min_ielts: null, // ...or English-test minimums
    living_cost_per_year: livingCost(
      get(raw, "latest.cost.roomboard.oncampus"),
      get(raw, "latest.cost.otherexpense.oncampus")
    ),
    student_size: get(raw, "latest.student.size") ?? null,
    completion_rate: pct(get(raw, "latest.completion.completion_rate_4yr_150nt")),
    // Share of first-time, full-time students who come back for year two.
    retention_rate: pct(get(raw, "latest.student.retention_rate.four_year.full_time")),
    research_intensity: researchIntensity(get(raw, "school.carnegie_basic")),
    median_earnings_10yr: get(raw, "latest.earnings.10_yrs_after_entry.median") ?? null,
    popular_programs: topPrograms(get(raw, "latest.academics.program_percentage")),
    degree_levels: degreeLevels(
      get(raw, "school.degrees_awarded.highest"),
      get(raw, "latest.programs.cip_4_digit")
    ),
    description: describe(ownership, city, state),
    // The school's own page on the official College Scorecard site.
    source_url: `https://collegescorecard.ed.gov/school/?${raw.id}`,
    source: "College Scorecard",
    data_year: dataYear,
    fetched_at: fetchedAt,
  };
}
