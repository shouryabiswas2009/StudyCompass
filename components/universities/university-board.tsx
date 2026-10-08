"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MotionConfig } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { compareUrl, MAX_COMPARE } from "@/lib/compare";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
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
  boardQuery,
  hasActiveFilters,
  NO_FILTERS,
  type BoardState,
  type SortKey,
  type UniversityFilters,
} from "@/lib/university-filters";
import { DEGREE_LEVELS, type ApplicationStatus, type DegreeLevel } from "@/lib/types";
import { LIST_MIX } from "@/lib/scoring-config";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "best", label: "Best you can get into" },
  { value: "safest", label: "Safest first" },
  { value: "match", label: "Best match" },
  { value: "tuition-asc", label: "Lowest tuition" },
  { value: "tuition-desc", label: "Highest tuition" },
  { value: "ranking", label: "Strongest first (Unicelerate index)" },
];

// Visitors have no profile, so only orders that don't need one.
const GUEST_SORT_OPTIONS: { value: SortKey; label: string }[] = [
  // For visitors "best" is quality alone, which is the strength index.
  { value: "best", label: "Strongest first (Unicelerate index)" },
  { value: "tuition-asc", label: "Lowest tuition" },
  { value: "tuition-desc", label: "Highest tuition" },
];

const CHANCES: AdmissionChance[] = ["Reach", "Match", "Safety", "Not enough data"];

// One line under each group heading in the grouped view.
const GROUP_NOTES: Record<AdmissionChance, string> = {
  Reach: "Long shots. Worth applying to a few, but don't count on any of them.",
  Match: "Your chances look reasonable.",
  Safety: "Likely admits. Make sure you'd be happy to go.",
  "Not enough data": "No admission figures to judge your chances (common outside the US).",
};

// Radix Select can't use "" as a value, so "any" stands for "no filter".
const ANY = "any";

// How long to wait after the last keystroke before searching, so typing
// "toronto" makes one request, not seven.
const TYPING_DELAY_MS = 300;

// Blank input → no bound.
function parseBound(value: string): number | null {
  const n = Number(value);
  return value.trim() === "" || Number.isNaN(n) ? null : n;
}

export type FeaturedInfo = {
  featuredCount: number; // schools shown by default
  allCount: number; // every school you could see
  ready: boolean; // false until supabase/featured/featured.sql has been run
};

// Shared by the browse, recommendations and saved pages. The server has
// already filtered, sorted and paginated (lib/university-filters.ts), so
// this component only gets one page of cards. Changing a control updates
// the URL, and the server sends back the new page.
export function UniversityBoard({
  entries,
  state,
  totalPages,
  matchingCount,
  countries,
  featured,
  savedIds,
  emptyMessage,
  showDegreeFilter = false,
  applications,
  groups,
  groupable = false,
  guest = false,
}: {
  entries: MatchEntry[]; // this page only
  state: BoardState;
  totalPages: number;
  matchingCount: number; // how many match the filters, across all pages
  countries: string[];
  // Present on pages with the featured / "include all" toggle.
  featured?: FeaturedInfo;
  savedIds: Set<string>;
  emptyMessage: React.ReactNode;
  // Recommendations are already limited to the student's degree level, so
  // only the browse page needs this filter.
  showDegreeFilter?: boolean;
  // Saved page only: tracked applications by university id. When given,
  // each card shows a status dropdown (or a "Track" button).
  applications?: Record<string, { id: string; status: ApplicationStatus }>;
  // Grouped view (recommendations): the top of each Reach / Match / Safety
  // group, and whether the page offers the "group" switch at all.
  groups?: { chance: AdmissionChance; entries: MatchEntry[]; total: number }[];
  groupable?: boolean;
  // A visitor without an account: no personal scores, saving or comparing.
  guest?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { filters } = state;

  // Raw text of the search and tuition boxes, so typing isn't reformatted
  // under the student's cursor while the request is on its way.
  const [queryText, setQueryText] = useState(filters.query);
  const [tuitionMinText, setTuitionMinText] = useState(filters.tuitionMin?.toString() ?? "");
  const [tuitionMaxText, setTuitionMaxText] = useState(filters.tuitionMax?.toString() ?? "");
  // Schools ticked for comparison (kept in order of ticking). This stays
  // while paging, because the component isn't remounted.
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // The latest state, for the typing timer (which fires after a render).
  const latestState = useRef(state);
  useEffect(() => {
    latestState.current = state;
  });
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(next: BoardState) {
    startTransition(() => {
      router.replace(`${pathname}${boardQuery(next)}`, { scroll: false });
    });
  }

  // Any filter change goes back to page 1.
  function update(changes: Partial<UniversityFilters>) {
    const current = latestState.current;
    navigate({ ...current, filters: { ...current.filters, ...changes }, page: 1 });
  }

  function updateAfterTyping(changes: Partial<UniversityFilters>) {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => update(changes), TYPING_DELAY_MS);
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, MAX_COMPARE)
    );
  }

  function toggleChance(chance: AdmissionChance) {
    update({
      chances: filters.chances.includes(chance)
        ? filters.chances.filter((c) => c !== chance)
        : [...filters.chances, chance],
    });
  }

  function clearFilters() {
    setQueryText("");
    setTuitionMinText("");
    setTuitionMaxText("");
    update({ ...NO_FILTERS, sortBy: filters.sortBy });
  }

  const pageHref = (page: number) => `${pathname}${boardQuery({ ...state, page })}`;

  if (!featured && matchingCount === 0 && !hasActiveFilters(filters)) {
    return <EmptyState message={emptyMessage} />;
  }


  function renderCards(list: MatchEntry[]) {
    // MotionConfig: the cards' animations (entrance, sliding to a new place
    // after sorting) follow the visitor's "reduce motion" setting.
    return (
      <MotionConfig reducedMotion="user">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((entry, i) => (
          <UniversityCard
            key={entry.university.id}
            university={entry.university}
            match={entry.match}
            explanation={entry.explanation}
            ranking={entry.ranking}
            prediction={entry.prediction}
            rank={entry.rank}
            visa={entry.visa}
            isSaved={savedIds.has(entry.university.id)}
            index={i}
            guest={guest}
            compare={
              guest
                ? undefined
                : {
                    selected: compareIds.includes(entry.university.id),
                    disabled: !compareIds.includes(entry.university.id) && compareIds.length >= MAX_COMPARE,
                    onToggle: () => toggleCompare(entry.university.id),
                  }
            }
            tracking={applications ? { application: applications[entry.university.id] ?? null } : undefined}
          />
        ))}
      </div>
      </MotionConfig>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryText}
              onChange={(e) => {
                setQueryText(e.target.value);
                updateAfterTyping({ query: e.target.value });
              }}
              placeholder="Search universities by name"
              aria-label="Search universities by name"
              className="pl-8"
            />
          </div>
          <Select value={filters.sortBy} onValueChange={(v) => update({ sortBy: v as SortKey })}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Sort by">
              <SlidersHorizontal className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(guest ? GUEST_SORT_OPTIONS : SORT_OPTIONS).map((option) => (
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
              onValueChange={(v) => update({ degreeLevel: v === ANY ? null : (v as DegreeLevel) })}
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
                updateAfterTyping({ tuitionMin: parseBound(e.target.value) });
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
                updateAfterTyping({ tuitionMax: parseBound(e.target.value) });
              }}
              placeholder="Max tuition"
              aria-label="Maximum tuition (USD per year)"
              className="sm:w-28"
            />
          </div>

          {/* Chances are personal, so visitors without a profile don't get this filter. */}
          {!guest && (
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
          )}

          {hasActiveFilters(filters) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span aria-live="polite">
            {matchingCount.toLocaleString("en-US")}{" "}
            {matchingCount === 1 ? "university" : "universities"}
            {hasActiveFilters(filters) ? " match your filters" : ""}
            {totalPages > 1 ? ` · page ${state.page} of ${totalPages}` : ""}
          </span>
          {featured && <FeaturedToggle featured={featured} state={state} onChange={navigate} />}
        </div>
      </div>

      {groupable && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.group}
            onChange={() => navigate({ ...state, group: !state.group, page: 1 })}
            className="size-4 accent-primary"
          />
          Group by Reach / Match / Safety
        </label>
      )}

      {entries.length === 0 ? (
        <EmptyState message="No universities match these filters — try clearing one." />
      ) : groups ? (
        <div className={`space-y-10 transition-opacity ${isPending ? "opacity-60" : ""}`} aria-busy={isPending}>
          <p className="border-l-2 border-primary py-1 pl-3 text-sm">
            A balanced list often has {LIST_MIX.reach} reach, {LIST_MIX.match} match and {LIST_MIX.safety} safety
            schools. The labels come from a demo estimate, not a prediction: very selective schools are a reach for
            almost everyone, even strong applicants, and nothing here is a promise.
          </p>
          {groups.map((group) => (
            <section key={group.chance} aria-labelledby={`group-${group.chance}`} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id={`group-${group.chance}`} className="text-lg font-semibold">
                    {group.chance} <span className="text-muted-foreground">({group.total})</span>
                  </h2>
                  <p className="text-sm text-muted-foreground">{GROUP_NOTES[group.chance]}</p>
                </div>
                {group.total > group.entries.length && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ ...state, filters: { ...filters, chances: [group.chance] }, page: 1 })}
                  >
                    See all {group.total}
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
              {renderCards(group.entries)}
            </section>
          ))}
        </div>
      ) : (
        <div className={`transition-opacity ${isPending ? "opacity-60" : ""}`} aria-busy={isPending}>
          {renderCards(entries)}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Pages">
          <PageLink href={pageHref(state.page - 1)} disabled={state.page <= 1}>
            <ChevronLeft className="size-4" />
            Previous
          </PageLink>
          <span className="text-sm text-muted-foreground">
            Page {state.page} of {totalPages}
          </span>
          <PageLink href={pageHref(state.page + 1)} disabled={state.page >= totalPages}>
            Next
            <ChevronRight className="size-4" />
          </PageLink>
        </nav>
      )}

      {/* Appears once something is ticked; stays visible while scrolling. */}
      {compareIds.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-3 rounded-md border bg-background px-4 py-2 shadow-md">
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
        Each card says where its figures come from: &ldquo;College Scorecard&rdquo;
        is official US Department of Education data; &ldquo;Illustrative&rdquo; is
        sample data, not official statistics. &ldquo;Strength&rdquo; is the
        Unicelerate index, our own estimate from open data, not a QS/THE-style
        ranking. Reach / Match / Safety (and the ~% next to
        it) comes from a model trained on simulated applicants — a demo of the
        method, not a real prediction.
      </p>
    </div>
  );
}

// "Showing 418 featured schools · Include all 1,624" — says what's hidden
// and how many, so nothing disappears silently.
function FeaturedToggle({
  featured,
  state,
  onChange,
}: {
  featured: FeaturedInfo;
  state: BoardState;
  onChange: (next: BoardState) => void;
}) {
  if (!featured.ready) {
    return <span>Showing all schools (the featured list hasn&apos;t been set up yet).</span>;
  }
  const all = featured.allCount.toLocaleString("en-US");
  return state.showAll ? (
    <span>
      Including all {all} schools.{" "}
      <button type="button" className="underline" onClick={() => onChange({ ...state, showAll: false, page: 1 })}>
        Show featured only ({featured.featuredCount.toLocaleString("en-US")})
      </button>
    </span>
  ) : (
    <span>
      Featured schools only ({featured.featuredCount.toLocaleString("en-US")}).{" "}
      <button type="button" className="underline" onClick={() => onChange({ ...state, showAll: true, page: 1 })}>
        Include all {all} schools
      </button>
    </span>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  // prefetch={false}: each page is rendered on the server for this student,
  // so prefetching every "Next" link would just add server work.
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={href} prefetch={false}>
        {children}
      </Link>
    </Button>
  );
}

function EmptyState({ message }: { message: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 border-y py-16 text-center">
      <Search className="size-5 text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-muted-foreground">{message}</p>
    </div>
  );
}
