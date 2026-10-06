import { describe, expect, it } from "vitest";
import {
  bestIndexes,
  compareUrl,
  MAX_COMPARE,
  parseCompareIds,
  totalYearlyCost,
} from "@/lib/compare";
import type { University } from "@/lib/types";

const id = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;

describe("parseCompareIds", () => {
  it("reads a comma-separated ids param", () => {
    expect(parseCompareIds({ ids: `${id(1)},${id(2)}` })).toEqual([id(1), id(2)]);
  });

  it("still understands old ?a=&b= links", () => {
    expect(parseCompareIds({ a: id(1), b: id(2) })).toEqual([id(1), id(2)]);
  });

  it("drops junk and duplicates and caps the list", () => {
    const ids = parseCompareIds({
      ids: [id(1), "not-a-uuid", id(1), id(2), id(3), id(4), id(5)].join(","),
    });
    expect(ids).toEqual([id(1), id(2), id(3), id(4)]);
    expect(ids).toHaveLength(MAX_COMPARE);
  });

  it("returns nothing for an empty URL", () => {
    expect(parseCompareIds({})).toEqual([]);
  });
});

describe("compareUrl", () => {
  it("builds the ids param, or the bare page when empty", () => {
    expect(compareUrl([id(1), id(2)])).toBe(`/compare?ids=${id(1)},${id(2)}`);
    expect(compareUrl([])).toBe("/compare");
  });
});

describe("totalYearlyCost", () => {
  it("adds tuition and living cost", () => {
    const u = { tuition: 30000, living_cost_per_year: 15000 } as University;
    expect(totalYearlyCost(u)).toBe(45000);
  });

  it("is unknown when the living cost is unknown", () => {
    const u = { tuition: 30000, living_cost_per_year: null } as University;
    expect(totalYearlyCost(u)).toBeNull();
  });
});

describe("bestIndexes", () => {
  it("picks the lowest when lower is better", () => {
    expect(bestIndexes([30000, 12000, 45000], "lower")).toEqual(new Set([1]));
  });

  it("picks the highest when higher is better, including ties", () => {
    expect(bestIndexes([90, 70, 90], "higher")).toEqual(new Set([0, 2]));
  });

  it("ignores unknown values", () => {
    expect(bestIndexes([null, 20000, 15000], "lower")).toEqual(new Set([2]));
  });

  it("highlights nothing when there's no real winner", () => {
    expect(bestIndexes([50, 50], "higher").size).toBe(0);
    expect(bestIndexes([50, null], "higher").size).toBe(0);
  });
});
