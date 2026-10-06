"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { compareUrl, MAX_COMPARE } from "@/lib/compare";
import { Compass, Search, SlidersHorizontal, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversityCard } from "@/components/universities/university-card";
import { Flag } from "@/components/flag";
import type { AdmissionChance, MatchEntry } from "@/lib/matching";
import {
  applyFilters,
  hasActiveFilters,
  NO_FILTERS,
  type SortKey,
  type UniversityFilters,
} from "@/lib/university-filters";
import { DEGREE_LEVELS, type ApplicationStatus, type DegreeLevel } from "@/lib/types";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "match", label: "Best match" },
  { value: "tuition-asc", label: "Lowest tuition" },
  { value: "tuition-desc", label: "Highest tuition" },
  { value: "ranking", label: "Best ranking" },
];

const CHANCES: AdmissionChance[] = ["Reach", "Match", "Safety"];

// Radix Select can't use "" as a value, so "any" stands for "no filter".
const ANY = "any";

// Blank input → no bound.
function parseBound(value: string): number | null {
  const n = Number(value);
  return value.trim() === "" || Number.isNaN(n) ? null : n;
}

// Shared by the browse, recommendations and saved pages: search, filter and
// sort controls over an already-scored list, plus the card grid. All state
// is local — the `matches` array is fetched once on the server — and the
// filtering rules themselves live in lib/university-filters.ts.
export function UniversityBoard({
  matches,
  savedIds,
  emptyMessage,
  showDegreeFilter = false,
  applications,
}: {
  matches: MatchEntry[];
  savedIds: Set<string>;
  emptyMessage: React.ReactNode;
  // Recommendations are already limited to the student's degree level, so
  // only the browse page needs this filter.
  showDegreeFilter?: boolean;
  // Saved page only: tracked applications by university id. When given,
  // each card shows a status dropdown (or a "Track" button).
  applications?: Record<string, { id: string; status: ApplicationStatus }>;
}) {
  const [filters, setFilters] = useState<UniversityFilters>(NO_FILTERS);
  // Raw text of the tuition boxes, so typing "1" on the way to "10000"
  // doesn't get reformatted under the student's cursor.
  const [tuitionMinText, setTuitionMinText] = useState("");
  const [tuitionMaxText, setTuitionMaxText] = useState("");
  // Schools ticked for comparison (kept in order of ticking).
  const [compareIds, setCompareIds] = useState<string[]>([]);

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, MAX_COMPARE)
    );
  }

  const countries = useMemo(
    () => Array.from(new Set(matches.map((m) => m.university.country))).sort(),
    [matches]
  );

  const visible = useMemo(() => applyFilters(matches, filters), [matches, filters]);

  function update(changes: Partial<UniversityFilters>) {
    setFilters((prev) => ({ ...prev, ...changes }));
  }

  function toggleChance(chance: AdmissionChance) {
    update({
      chances: filters.chances.includes(chance)
        ? filters.chances.filter((c) => c !== chance)
        : [...filters.chances, chance],
    });
  }

  function clearFilters() {
    setFilters({ ...NO_FILTERS, sortBy: filters.sortBy });
    setTuitionMinText("");
    setTuitionMaxText("");
  }

  if (matches.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="Search universities by name"
              aria-label="Search universities by name"
              className="pl-8"
            />
          </div>
          <Select
            value={filters.sortBy}
            onValueChange={(v) => update({ sortBy: v as SortKey })}
          >
            <SelectTrigger className="w-full sm:w-52" aria-label="Sort by">
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

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.country ?? ANY}
            onValueChange={(v) => update({ country: v === ANY ? null : v })}
          >
            <SelectTrigger className="w-full sm:w-48" aria-label="Country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All countries</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  <Flag country={country} /> {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showDegreeFilter && (
            <Select
              value={filters.degreeLevel ?? ANY}
              onValueChange={(v) =>
                update({ degreeLevel: v === ANY ? null : (v as DegreeLevel) })
              }
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Degree level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any degree level</SelectItem>
                {DEGREE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input
              type="number"
              min={0}
              step={1000}
              value={tuitionMinText}
              onChange={(e) => {
                setTuitionMinText(e.target.value);
                update({ tuitionMin: parseBound(e.target.value) });
              }}
              placeholder="Min tuition"
              aria-label="Minimum tuition (USD per year)"
              className="sm:w-28"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              min={0}
              step={1000}
              value={tuitionMaxText}
              onChange={(e) => {
                setTuitionMaxText(e.target.value);
                update({ tuitionMax: parseBound(e.target.value) });
              }}
              placeholder="Max tuition"
              aria-label="Maximum tuition (USD per year)"
              className="sm:w-28"
            />
          </div>

          <div className="flex gap-2">
            {CHANCES.map((chance) => (
              <Badge
                key={chance}
                asChild
                variant={filters.chances.includes(chance) ? "default" : "outline"}
                className="cursor-pointer select-none"
              >
                <button
                  type="button"
                  aria-pressed={filters.chances.includes(chance)}
                  onClick={() => toggleChance(chance)}
                >
                  {chance}
                </button>
              </Badge>
            ))}
          </div>

          {hasActiveFilters(filters) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" />
              Clear filters
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {visible.length} of {matches.length}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState message="No universities match these filters — try clearing one." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry, i) => (
            <UniversityCard
              key={entry.university.id}
              university={entry.university}
              match={entry.match}
              explanation={entry.explanation}
              ranking={entry.ranking}
              prediction={entry.prediction}
              isSaved={savedIds.has(entry.university.id)}
              index={i}
              compare={{
                selected: compareIds.includes(entry.university.id),
                disabled:
                  !compareIds.includes(entry.university.id) && compareIds.length >= MAX_COMPARE,
                onToggle: () => toggleCompare(entry.university.id),
              }}
              tracking={
                applications
                  ? { application: applications[entry.university.id] ?? null }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Appears once something is ticked; stays visible while scrolling. */}
      {compareIds.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
          <span className="text-sm">
            {compareIds.length} of {MAX_COMPARE} selected
          </span>
          {/* A link can't be "disabled", so show a plain disabled button
              until there are at least two schools to compare. */}
          {compareIds.length >= 2 ? (
            <Button size="sm" asChild>
              <Link href={compareUrl(compareIds)}>Compare</Link>
            </Button>
          ) : (
            <Button size="sm" disabled>
              Pick one more
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setCompareIds([])}>
            Clear
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tuition, rankings and admission figures are illustrative approximations
        for this demo, not official statistics. Reach / Match / Safety (and the
        ~% next to it for undergraduate profiles) comes from a model trained on
        simulated applicants — a demo of the method, not a real prediction.
      </p>
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
