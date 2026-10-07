import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scoreUniversity, type MatchEntry } from "@/lib/matching";
import { compareBest, groupByChance, withNeutralUnknowns } from "@/lib/ranking";
import type { Profile, UniversitySummary } from "@/lib/types";
// The same rule that marks schools "featured" in the database.
import { isFeatured } from "../scripts/relevance-rule.mjs";

// Ranking checks on REAL data: the College Scorecard file committed in the
// repo (data/scorecard/universities.json, 1,577 US schools), plus a few
// non-US schools shaped like the curated rows (no admission figures).
// Run with SHOW_TOP10=1 to print each student's top 10.

type ScorecardRow = Omit<UniversitySummary, "id" | "created_by" | "is_featured"> & { scorecard_id: number };
const file = JSON.parse(readFileSync(join(process.cwd(), "data", "scorecard", "universities.json"), "utf8"));
const rows: ScorecardRow[] = Array.isArray(file) ? file : file.universities;

const us: UniversitySummary[] = rows.map((r) => ({
  aliases: [],
  coop_program: "unknown",
  internship_support_url: null,
  tuition_local: null,
  tuition_currency: null,
  tuition_basis: null,
  fx_rate_date: null,
  ...r,
  id: String(r.scorecard_id),
  created_by: null,
  is_featured: isFeatured(r),
}));

// Non-US schools as they look in the app: curated, fees known, no
// admission data, no Scorecard outcomes.
const international = (name: string, country: string, tuition: number): UniversitySummary =>
  ({
    ...us[0],
    id: `intl-${name}`,
    name,
    country,
    city: null,
    state: null,
    source: "curated",
    tuition,
    living_cost_per_year: null,
    acceptance_rate: null,
    sat_25: null,
    sat_75: null,
    avg_admitted_gpa: null,
    min_ielts: null,
    completion_rate: null,
    retention_rate: null,
    median_earnings_10yr: null,
    research_intensity: null,
    popular_programs: ["Computer Science", "Engineering"],
    is_featured: true,
  }) as UniversitySummary;

const INTERNATIONAL = [
  international("University of Toronto", "Canada", 46000),
  international("University of Edinburgh", "United Kingdom", 34000),
  international("TU Delft", "Netherlands", 23000),
];

const featured = [...us.filter((u) => u.is_featured), ...INTERNATIONAL];

const profile = (overrides: Partial<Profile>): Profile => ({
  id: "test",
  full_name: "Test",
  country: "India",
  intended_majors: ["Computer Science"],
  gpa_percentage: 85,
  ielts_score: 7,
  sat_score: 1300,
  budget_min: 0,
  budget_max: 60000,
  preferred_countries: [],
  preferred_degree_level: "Undergraduate",
  focuses: [],
  created_at: "",
  updated_at: "",
  ...overrides,
});

export const STRONG = profile({ gpa_percentage: 95, sat_score: 1500, ielts_score: 8, budget_max: 90000 });
export const MIDDLE = profile({ gpa_percentage: 82, sat_score: 1200, ielts_score: 6.5, budget_max: 30000 });
export const WEAKER = profile({ gpa_percentage: 70, sat_score: 1000, ielts_score: 6, budget_max: 40000 });

function ranked(p: Profile, pool = featured): MatchEntry[] {
  return withNeutralUnknowns(pool.map((u) => scoreUniversity(p, u))).sort(compareBest);
}

const position = (list: MatchEntry[], name: RegExp) => list.findIndex((e) => name.test(e.university.name));

function show(label: string, list: MatchEntry[]) {
  if (!process.env.SHOW_TOP10) return;
  console.log(`\n${label}`);
  list.slice(0, 10).forEach((e, i) =>
    console.log(
      `${String(i + 1).padStart(2)}. ${e.university.name} | ${e.match.chance}` +
        `${e.prediction ? ` ~${Math.round(e.prediction.probability * 100)}%` : ""}` +
        ` | quality ${e.rank.quality === null ? "n/a" : e.rank.quality.toFixed(2)} | fit ${e.match.score} | ${e.rank.reason}`
    )
  );
}

describe("ranking on real College Scorecard data", () => {
  it("prints the top 10 for each test student (SHOW_TOP10=1)", () => {
    show("STRONG (GPA 95, SAT 1500, IELTS 8, $90k)", ranked(STRONG));
    show("MIDDLE (GPA 82, SAT 1200, IELTS 6.5, $30k)", ranked(MIDDLE));
    show("WEAKER (GPA 70, SAT 1000, IELTS 6, $40k)", ranked(WEAKER));
    show("STRONG, old order (fit score only)", featured.map((u) => scoreUniversity(STRONG, u)).sort((a, b) => b.match.score - a.match.score));
    show("MIDDLE, old order (fit score only)", featured.map((u) => scoreUniversity(MIDDLE, u)).sort((a, b) => b.match.score - a.match.score));
    show("WEAKER, old order (fit score only)", featured.map((u) => scoreUniversity(WEAKER, u)).sort((a, b) => b.match.score - a.match.score));
    if (process.env.SHOW_TOP10) {
      const all = [...us, ...INTERNATIONAL];
      for (const [label, p] of [["STRONG", STRONG], ["MIDDLE", MIDDLE], ["WEAKER", WEAKER]] as const) {
        const list = ranked(p, all);
        const at = (re: RegExp) => {
          const i = position(list, re);
          const e = list[i];
          return `${re.source.slice(0, 26)} #${i + 1} (${e.match.chance}${e.prediction ? ` ${Math.round(e.prediction.probability * 100)}%` : ""}, q ${e.rank.quality?.toFixed(2) ?? "n/a"})`;
        };
        console.log(`
${label} in ALL schools: ` + [/^Massachusetts Institute of Technology/, /^Stanford University/, /CUNY Bernard M Baruch/, /CUNY York College/, /CUNY Medgar/, /College of Staten Island/, /University of Toronto/].map(at).join(" | "));
      }
    }
    if (process.env.SHOW_TOP10) {
      const strongFeatured = ranked(STRONG);
      const qualities = strongFeatured.map((e) => e.rank.quality).filter((q): q is number => q !== null).sort((a, b) => a - b);
      console.log(`
FEATURED pool ${strongFeatured.length}; median quality ${qualities[Math.floor(qualities.length / 2)].toFixed(2)}; Toronto #${position(strongFeatured, /Toronto/) + 1}`);
      const canada = ranked({ ...STRONG, preferred_countries: ["Canada"] });
      console.log(`STRONG choosing Canada: Toronto #${position(canada, /Toronto/) + 1}`);
    }
    expect(true).toBe(true);
  });
});

const ALL = [...us, ...INTERNATIONAL];
const name = (e: MatchEntry) => e.university.name;
const MIT = /^Massachusetts Institute of Technology$/;
const STANFORD = /^Stanford University$/;
// Open-admission style schools: admit most applicants and show weak outcomes.
const isOpenAdmission = (e: MatchEntry) =>
  (e.university.acceptance_rate ?? 0) >= 80 && e.rank.quality !== null && e.rank.quality < 0.35;

describe("strong student (GPA 95, SAT 1500, IELTS 8, high budget)", () => {
  const top = ranked(STRONG);
  const all = ranked(STRONG, ALL);

  it("puts highly regarded schools first", () => {
    for (const e of top.slice(0, 10)) expect(e.rank.quality ?? 0).toBeGreaterThanOrEqual(0.7);
  });

  it("labels MIT and Stanford Reach, and keeps them above open-admission colleges", () => {
    for (const school of [MIT, STANFORD]) {
      const at = position(all, school);
      expect(all[at].match.chance).toBe("Reach");
      for (const weak of [/CUNY York College/, /CUNY Medgar Evers/, /College of Staten Island CUNY/]) {
        expect(at).toBeLessThan(position(all, weak));
      }
    }
  });

  it("puts strong state flagships above CUNY-type schools", () => {
    for (const flagship of [/^University of Michigan-Ann Arbor$/, /^University of Wisconsin-Madison$/, /^University of Maryland-College Park$/]) {
      for (const cuny of [/CUNY Bernard M Baruch/, /CUNY York College/, /CUNY Lehman/]) {
        expect(position(all, flagship)).toBeLessThan(position(all, cuny));
      }
    }
  });

  it("never ranks an open-admission school above a stronger school they're likely to get into (regression)", () => {
    const strongAttainable = all.filter(
      (e) => e.rank.gate.passes && e.rank.plausibility >= 0.9 && (e.rank.quality ?? 0) >= 0.6
    );
    const open = all.filter(isOpenAdmission);
    expect(open.length).toBeGreaterThan(10);
    const lastStrong = Math.max(...strongAttainable.map((e) => all.indexOf(e)));
    const firstOpen = Math.min(...open.map((e) => all.indexOf(e)));
    expect(lastStrong).toBeLessThan(firstOpen);
  });

  it("shows MIT-tier schools at the top of the Reach group", () => {
    const reach = groupByChance(top).find((g) => g.chance === "Reach")!;
    expect(reach.entries.slice(0, 5).map(name)).toEqual(expect.arrayContaining(["Massachusetts Institute of Technology"]));
  });
});

describe("middle student (GPA 82, SAT 1200, budget ~$30,000)", () => {
  const top = ranked(MIDDLE);

  it("puts attainable, well-regarded schools above long shots and weak schools", () => {
    for (const e of top.slice(0, 10)) {
      expect(e.match.chance).not.toBe("Reach");
      expect(e.rank.quality ?? 0).toBeGreaterThanOrEqual(0.5);
    }
    expect(position(top, MIT)).toBeGreaterThan(100);
  });
});

describe("weaker student (GPA 70, SAT 1000)", () => {
  const top = ranked(WEAKER);

  it("puts Match and Safety above Reach, and MIT nowhere near the top", () => {
    for (const e of top.slice(0, 10)) expect(["Match", "Safety"]).toContain(e.match.chance);
    expect(position(top, MIT)).toBeGreaterThan(150); // of 374 featured schools
  });
});

describe("missing data", () => {
  it("handles a student with no SAT and no IELTS", () => {
    const list = ranked({ ...STRONG, sat_score: null, ielts_score: null });
    expect(list.length).toBe(featured.length);
    expect(list.every((e) => Number.isFinite(e.rank.realistic))).toBe(true);
  });

  it("doesn't bury non-US schools that publish no admission data", () => {
    const list = ranked(STRONG);
    const toronto = position(list, /University of Toronto/);
    expect(list[toronto].match.chance).toBe("Not enough data");
    expect(list[toronto].rank.quality).toBeNull();
    expect(toronto).toBeLessThan(list.length / 2);
    // And when the student chooses that country, it leads.
    expect(position(ranked({ ...STRONG, preferred_countries: ["Canada"] }), /University of Toronto/)).toBe(0);
  });
});

