import { unstable_cache } from "next/cache";
import { anonClient } from "@/lib/data/universities";
import type { CountryInfo } from "@/lib/country-info";

// Loads the visa / post-study guidance (table country_info, migration_012).
// It's the same for everyone and only changes when seed_country_info.sql is
// re-run, so the whole table (one row per country, ~30 rows) is cached.

export type CountryInfoResult = {
  byCountry: Map<string, CountryInfo>;
  // True when the table doesn't exist yet (migration_012 not run): the page
  // says so instead of showing every figure as "not available".
  pending: boolean;
};

// PostgREST reports a missing table as PGRST205 ("Could not find the table");
// Postgres itself as 42P01.
const MISSING_TABLE = new Set(["PGRST205", "42P01"]);

async function load(): Promise<{ rows: CountryInfo[]; pending: boolean }> {
  const { data, error } = await anonClient().from("country_info").select("*").returns<CountryInfo[]>();
  if (error) {
    if (error.code && MISSING_TABLE.has(error.code)) return { rows: [], pending: true };
    throw new Error(error.message);
  }
  return { rows: data ?? [], pending: false };
}

const loadCached = unstable_cache(
  async () => {
    const result = await load();
    // Don't cache "not set up yet": once the migration runs, the next visit
    // should see the rows. Throwing skips the cache.
    if (result.pending) throw new Error("pending migration");
    return result.rows;
  },
  ["country-info", "v1"],
  { revalidate: 3600, tags: ["country-info"] }
);

export async function getCountryInfo(): Promise<CountryInfoResult> {
  let rows: CountryInfo[];
  let pending = false;
  try {
    rows = await loadCached();
  } catch {
    try {
      ({ rows, pending } = await load());
    } catch {
      // Guidance is extra information: never break the page over it.
      rows = [];
    }
  }
  return { byCountry: new Map(rows.map((row) => [row.country, row])), pending };
}
