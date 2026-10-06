"use client";

import { useMemo, useState } from "react";
import { Compass, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UniversityCard } from "@/components/universities/university-card";
import { Flag } from "@/components/flag";
import type { University } from "@/lib/types";

export type MatchEntry = {
  university: University;
  score: number;
  explanation: string;
  ranking: { rank: number; label: string };
};

type SortKey = "match" | "tuition-asc" | "tuition-desc" | "ranking";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "match", label: "Best match" },
  { value: "tuition-asc", label: "Lowest tuition" },
  { value: "tuition-desc", label: "Highest tuition" },
  { value: "ranking", label: "Best ranking" },
];

// Shared by the recommendations and saved pages: sort/filter controls over
// an already-scored list of universities, plus the resulting card grid.
// All state is local — the `matches` array is fetched once server-side.
export function UniversityBoard({
  matches,
  savedIds,
  emptyMessage,
}: {
  matches: MatchEntry[];
  savedIds: Set<string>;
  emptyMessage: React.ReactNode;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("match");
  const [activeCountries, setActiveCountries] = useState<Set<string>>(
    new Set()
  );

  const countries = useMemo(
    () => Array.from(new Set(matches.map((m) => m.university.country))).sort(),
    [matches]
  );

  function toggleCountry(country: string) {
    setActiveCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  }

  const visible = useMemo(() => {
    const filtered =
      activeCountries.size > 0
        ? matches.filter((m) => activeCountries.has(m.university.country))
        : matches;

    const sorted = [...filtered];
    switch (sortBy) {
      case "tuition-asc":
        sorted.sort((a, b) => a.university.tuition - b.university.tuition);
        break;
      case "tuition-desc":
        sorted.sort((a, b) => b.university.tuition - a.university.tuition);
        break;
      case "ranking":
        sorted.sort((a, b) => a.ranking.rank - b.ranking.rank);
        break;
      default:
        sorted.sort((a, b) => b.score - a.score);
    }
    return sorted;
  }, [matches, activeCountries, sortBy]);

  if (matches.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {countries.map((country) => (
            <Badge
              key={country}
              asChild
              variant={activeCountries.has(country) ? "default" : "outline"}
              className="cursor-pointer gap-1 select-none"
            >
              <button type="button" onClick={() => toggleCountry(country)}>
                <Flag country={country} /> {country}
              </button>
            </Badge>
          ))}
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-56">
            <SlidersHorizontal className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState message="No universities match these filters — try clearing one." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((match, i) => (
            <UniversityCard
              key={match.university.id}
              university={match.university}
              matchScore={match.score}
              explanation={match.explanation}
              ranking={match.ranking}
              isSaved={savedIds.has(match.university.id)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Compass className="size-5 text-muted-foreground" />
      </div>
      <p className="max-w-sm text-muted-foreground">{message}</p>
    </div>
  );
}
