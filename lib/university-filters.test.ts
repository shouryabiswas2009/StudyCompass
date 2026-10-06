import { describe, expect, it } from "vitest";
import { applyFilters, hasActiveFilters, NO_FILTERS } from "@/lib/university-filters";
import type { AdmissionChance, MatchEntry } from "@/lib/matching";
import type { University } from "@/lib/types";

// Only the fields the filters read matter here; the rest are placeholders.
function entry(
  name: string,
  overrides: Partial<University> = {},
  extra: { score?: number; chance?: AdmissionChance; rank?: number | null } = {}
): MatchEntry {
  const university = {
    id: name,
    name,
    country: "Canada",
    tuition: 30000,
    degree_levels: ["Undergraduate", "Masters", "PhD"],
    ...overrides,
  } as University;

  return {
    university,
    match: {
      score: extra.score ?? 50,
      eligible: true,
      factors: [],
      chance: extra.chance ?? "Match",
      chanceSource: "rule",
    },
    explanation: { strengths: [], concerns: [] },
    ranking: { rank: extra.rank === undefined ? 10 : extra.rank, label: "Overall" },
    prediction: null,
  };
}

const names = (entries: MatchEntry[]) => entries.map((e) => e.university.name);

describe("applyFilters", () => {
  const entries = [
    entry("University of Toronto", { tuition: 45000 }, { score: 90, chance: "Match", rank: 21 }),
    entry("TU Munich", { country: "Germany", tuition: 3000 }, { score: 70, chance: "Safety", rank: 28 }),
    entry("MIT", { country: "United States", tuition: 58000 }, { score: 60, chance: "Reach", rank: 1 }),
    entry("Local College", { degree_levels: ["Undergraduate"], tuition: 2000 }, { score: 40, rank: null }),
  ];

  it("returns everything, best match first, with no filters", () => {
    expect(names(applyFilters(entries, NO_FILTERS))).toEqual([
      "University of Toronto",
      "TU Munich",
      "MIT",
      "Local College",
    ]);
  });

  it("searches by name, ignoring case", () => {
    expect(names(applyFilters(entries, { ...NO_FILTERS, query: "toRONto" }))).toEqual([
      "University of Toronto",
    ]);
  });

  it("filters by country", () => {
    expect(names(applyFilters(entries, { ...NO_FILTERS, country: "Germany" }))).toEqual([
      "TU Munich",
    ]);
  });

  it("filters by degree level but keeps schools whose levels are unknown", () => {
    const withUnknown = [...entries, entry("Mystery U", { degree_levels: [] })];
    const result = names(applyFilters(withUnknown, { ...NO_FILTERS, degreeLevel: "Masters" }));

    expect(result).not.toContain("Local College");
    expect(result).toContain("Mystery U");
  });

  it("filters by tuition range (inclusive)", () => {
    const result = applyFilters(entries, { ...NO_FILTERS, tuitionMin: 3000, tuitionMax: 45000 });
    expect(names(result)).toEqual(["University of Toronto", "TU Munich"]);
  });

  it("filters by Reach / Match / Safety", () => {
    const result = applyFilters(entries, { ...NO_FILTERS, chances: ["Reach", "Safety"] });
    expect(names(result)).toEqual(["TU Munich", "MIT"]);
  });

  it("sorts by ranking with unranked schools last", () => {
    const result = applyFilters(entries, { ...NO_FILTERS, sortBy: "ranking" });
    expect(names(result)).toEqual(["MIT", "University of Toronto", "TU Munich", "Local College"]);
  });

  it("sorts by tuition", () => {
    const result = applyFilters(entries, { ...NO_FILTERS, sortBy: "tuition-asc" });
    expect(names(result)[0]).toBe("Local College");
  });
});

describe("hasActiveFilters", () => {
  it("ignores the sort order and a blank search", () => {
    expect(hasActiveFilters({ ...NO_FILTERS, sortBy: "ranking", query: "  " })).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, country: "Japan" })).toBe(true);
  });
});
