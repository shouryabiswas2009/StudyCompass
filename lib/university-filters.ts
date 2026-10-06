import type { AdmissionChance, MatchEntry } from "@/lib/matching";
import type { DegreeLevel } from "@/lib/types";

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
  const query = filters.query.trim().toLowerCase();

  const filtered = entries.filter(({ university, match }) => {
    if (query && !university.name.toLowerCase().includes(query)) return false;
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
