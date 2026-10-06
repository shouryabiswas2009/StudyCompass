import type { University } from "@/lib/types";

// More than 4 columns stops being readable, especially on a phone.
export const MAX_COMPARE = 4;

// Supabase ids are UUIDs; anything else in the URL is ignored rather than
// sent to the database (where it would cause an "invalid uuid" error).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reads the schools to compare from the URL: `?ids=a,b,c`. Older links used
// `?a=...&b=...`, so those still work too.
export function parseCompareIds(params: { ids?: string; a?: string; b?: string }): string[] {
  const raw = [...(params.ids ?? "").split(","), params.a ?? "", params.b ?? ""];
  const ids = raw.map((id) => id.trim()).filter((id) => UUID.test(id));
  return Array.from(new Set(ids)).slice(0, MAX_COMPARE);
}

export function compareUrl(ids: string[]): string {
  return ids.length > 0 ? `/compare?ids=${ids.join(",")}` : "/compare";
}

// Tuition plus living costs. Unknown (null) when we don't know the living
// cost, rather than quietly showing tuition alone as if it were the total.
export function totalYearlyCost(university: University): number | null {
  const living = university.living_cost_per_year;
  return living === null || living === undefined ? null : university.tuition + living;
}

// Which columns to highlight as "best" in a comparison row. Ties are all
// highlighted; unknown values are skipped; and nothing is highlighted if
// fewer than two values are known or they're all equal (no real winner).
export function bestIndexes(
  values: (number | null)[],
  better: "higher" | "lower"
): Set<number> {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return new Set();

  const best = better === "higher" ? Math.max(...known) : Math.min(...known);
  const worst = better === "higher" ? Math.min(...known) : Math.max(...known);
  if (best === worst) return new Set();

  const winners = new Set<number>();
  values.forEach((value, i) => {
    if (value === best) winners.add(i);
  });
  return winners;
}
