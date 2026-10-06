import type { AdmissionChance, MatchEntry } from "@/lib/matching";
import { DEGREE_LEVELS, type DegreeLevel, type UniversitySummary } from "@/lib/types";

export type SortKey = "match" | "tuition-asc" | "tuition-desc" | "ranking";

// null / empty always means "don't filter on this".
export type UniversityFilters = {
  query: string;
  country: string | null;
  degreeLevel: DegreeLevel | null;
  tuitionMin: number | null;
  tuitionMax: number | null;
  chances: AdmissionChance[];
  sortBy: SortKey;
};

export const NO_FILTERS: UniversityFilters = {
  query: "",
  country: null,
  degreeLevel: null,
  tuitionMin: null,
  tuitionMax: null,
  chances: [],
  sortBy: "match",
};

// Kept as a plain function (not inside the React component) so the
// filtering rules can be unit-tested without rendering anything.
export function applyFilters(
  entries: MatchEntry[],
  filters: UniversityFilters
): MatchEntry[] {
  const query = searchable(filters.query.trim());

  const filtered = entries.filter(({ university, match }) => {
    if (query && !searchable(university.name).includes(query)) return false;
    if (filters.country && university.country !== filters.country) return false;

    // Same rule as matching: a school with unknown degree levels stays visible.
    const levels = university.degree_levels ?? [];
    if (filters.degreeLevel && levels.length > 0 && !levels.includes(filters.degreeLevel)) {
      return false;
    }

    if (filters.tuitionMin !== null && university.tuition < filters.tuitionMin) return false;
    if (filters.tuitionMax !== null && university.tuition > filters.tuitionMax) return false;
    if (filters.chances.length > 0 && !filters.chances.includes(match.chance)) return false;
    return true;
  });

  return sortEntries(filtered, filters.sortBy);
}

function sortEntries(entries: MatchEntry[], sortBy: SortKey): MatchEntry[] {
  const sorted = [...entries];
  switch (sortBy) {
    case "tuition-asc":
      return sorted.sort((a, b) => a.university.tuition - b.university.tuition);
    case "tuition-desc":
      return sorted.sort((a, b) => b.university.tuition - a.university.tuition);
    case "ranking":
      // Unranked schools go last rather than being treated as #0.
      return sorted.sort((a, b) => {
        if (a.ranking.rank === null) return b.ranking.rank === null ? 0 : 1;
        if (b.ranking.rank === null) return -1;
        return a.ranking.rank - b.ranking.rank;
      });
    default:
      return sorted.sort((a, b) => b.match.score - a.match.score);
  }
}

export function hasActiveFilters(filters: UniversityFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.country !== null ||
    filters.degreeLevel !== null ||
    filters.tuitionMin !== null ||
    filters.tuitionMax !== null ||
    filters.chances.length > 0
  );
}

// Lower-case and without accents, so "universite de montreal" finds
// "Université de Montréal" and "zurich" finds "Zürich". NFD splits "é" into
// "e" plus a combining accent, which the regex then removes.
export function searchable(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ─── Board state in the URL ───────────────────────────────────────────────
// Filters, sort, page and "include all schools" live in the URL, and the
// server does the filtering and pagination, so only one page of cards is
// ever sent to the browser. A URL can also be bookmarked or shared.

export const PAGE_SIZE = 24;

export type BoardState = {
  filters: UniversityFilters;
  page: number; // 1-based
  showAll: boolean; // include schools that aren't featured
};

type SearchParams = Record<string, string | string[] | undefined>;

const SORT_KEYS: SortKey[] = ["match", "tuition-asc", "tuition-desc", "ranking"];
const CHANCES: AdmissionChance[] = ["Reach", "Match", "Safety"];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

function bound(value: string): number | null {
  const n = Number(value);
  return value.trim() === "" || !Number.isFinite(n) ? null : n;
}

// Reads the board state from the URL. Anything unrecognised falls back to
// the default rather than erroring: URLs get edited and shared.
export function parseBoardParams(params: SearchParams): BoardState {
  const sort = first(params.sort) as SortKey;
  const degree = first(params.degree) as DegreeLevel;
  const page = Number(first(params.page));
  return {
    filters: {
      query: first(params.q).slice(0, 100),
      country: first(params.country) || null,
      degreeLevel: DEGREE_LEVELS.includes(degree) ? degree : null,
      tuitionMin: bound(first(params.min)),
      tuitionMax: bound(first(params.max)),
      chances: first(params.chance)
        .split(",")
        .filter((c): c is AdmissionChance => CHANCES.includes(c as AdmissionChance)),
      sortBy: SORT_KEYS.includes(sort) ? sort : "match",
    },
    page: Number.isInteger(page) && page > 1 ? page : 1,
    showAll: first(params.all) === "1",
  };
}

// The query string for a board state ("" when everything is default), so
// default URLs stay clean.
export function boardQuery({ filters, page, showAll }: BoardState): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.country) params.set("country", filters.country);
  if (filters.degreeLevel) params.set("degree", filters.degreeLevel);
  if (filters.tuitionMin !== null) params.set("min", String(filters.tuitionMin));
  if (filters.tuitionMax !== null) params.set("max", String(filters.tuitionMax));
  if (filters.chances.length > 0) params.set("chance", filters.chances.join(","));
  if (filters.sortBy !== "match") params.set("sort", filters.sortBy);
  if (showAll) params.set("all", "1");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

// One page of results. A page past the end shows the last page, so a stale
// "page=9" link after filtering still shows something.
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  return { items: items.slice((current - 1) * size, current * size), page: current, totalPages };
}

// ─── Featured schools ─────────────────────────────────────────────────────

// Shown by default: featured shared schools plus every school the student
// added. A missing is_featured (migration_010 not run) counts as featured,
// so nothing disappears before the migration.
export function isShownByDefault(university: UniversitySummary): boolean {
  return university.created_by !== null || university.is_featured !== false;
}

// True once supabase/featured/featured.sql has marked at least one school.
// Before that, every is_featured is the column's default (false), and
// hiding everything would be worse than showing everything.
export function featuredReady(universities: UniversitySummary[]): boolean {
  return universities.some((u) => u.is_featured === true);
}

// ─── Everything a board page needs, worked out on the server ──────────────

export type BoardData = {
  entries: MatchEntry[]; // the current page only
  page: number;
  totalPages: number;
  matchingCount: number;
  countries: string[];
  featured?: { featuredCount: number; allCount: number; ready: boolean };
  // Every school in the pool (before filters). Server-side only, for the
  // "top picks by country" section; never sent to the browser in full.
  pool: MatchEntry[];
};

// From every scored school to one page of cards: pick the pool (featured
// only, unless the student asked for all), filter and sort it, then cut out
// the requested page. `withFeatured: false` (the saved page) skips the
// featured step: a student's saved schools are always shown.
export function buildBoard(
  scored: MatchEntry[],
  state: BoardState,
  { withFeatured }: { withFeatured: boolean }
): BoardData {
  const ready = featuredReady(scored.map((e) => e.university));
  const defaultPool = scored.filter((e) => isShownByDefault(e.university));
  const pool = !withFeatured || state.showAll || !ready ? scored : defaultPool;

  const filtered = applyFilters(pool, state.filters);
  const { items, page, totalPages } = paginate(filtered, state.page);

  return {
    entries: items,
    page,
    totalPages,
    matchingCount: filtered.length,
    countries: Array.from(new Set(pool.map((e) => e.university.country))).sort(),
    featured: withFeatured
      ? { featuredCount: defaultPool.length, allCount: scored.length, ready }
      : undefined,
    pool,
  };
}

// The best few schools in each of the student's preferred countries, so one
// country (with far more schools in the data) can't crowd the others out of
// the top of the list.
export function topPicksByCountry(
  entries: MatchEntry[],
  preferredCountries: string[],
  perCountry = 3
): { country: string; picks: MatchEntry[] }[] {
  const key = (country: string) => country.trim().toLowerCase();
  const best = [...entries].sort((a, b) => b.match.score - a.match.score);
  return preferredCountries.map((country) => ({
    country,
    picks: best.filter((e) => key(e.university.country) === key(country)).slice(0, perCountry),
  }));
}
