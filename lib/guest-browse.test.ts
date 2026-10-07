import { describe, expect, it } from "vitest";
import { guestBrowseEntry } from "@/lib/guest-browse";
import { compareBest, withNeutralUnknowns } from "@/lib/ranking";
import type { UniversitySummary } from "@/lib/types";

const school = (name: string, overrides: Partial<UniversitySummary> = {}) =>
  ({
    id: name,
    name,
    country: "United States",
    source: "College Scorecard",
    created_by: null,
    qs_ranking: null,
    program_rankings: {},
    popular_programs: [],
    degree_levels: ["Undergraduate"],
    tuition: 30000,
    acceptance_rate: 60,
    sat_25: 1000,
    sat_75: 1200,
    completion_rate: 60,
    retention_rate: 80,
    median_earnings_10yr: 50000,
    research_intensity: "non_doctoral",
    ...overrides,
  }) as UniversitySummary;

describe("guestBrowseEntry", () => {
  it("shows no personal score or chance to a visitor", () => {
    const e = guestBrowseEntry(school("A"));
    expect(e.match.chance).toBe("Not enough data");
    expect(e.prediction).toBeNull();
    expect(e.rank.reason).toMatch(/Create a free profile/);
  });

  it("orders schools by quality, strongest first", () => {
    const strong = school("Strong", { sat_25: 1450, sat_75: 1560, completion_rate: 94, retention_rate: 97, median_earnings_10yr: 100000, research_intensity: "very_high" });
    const weak = school("Weak", { sat_25: 800, sat_75: 950, completion_rate: 30, retention_rate: 60, median_earnings_10yr: 38000 });
    const unknown = school("No data", { source: "curated", country: "Japan", sat_25: null, sat_75: null, completion_rate: null, retention_rate: null, median_earnings_10yr: null, research_intensity: null, acceptance_rate: null });
    const order = withNeutralUnknowns([weak, unknown, strong].map(guestBrowseEntry)).sort(compareBest).map((e) => e.university.name);
    expect(order).toEqual(["Strong", "No data", "Weak"]);
  });
});
