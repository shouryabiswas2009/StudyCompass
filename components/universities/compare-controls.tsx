"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compareUrl, MAX_COMPARE } from "@/lib/compare";

type Option = { id: string; name: string };

// The URL is the single source of truth for which schools are compared, so
// links can be shared and the back button works. Adding or removing a
// school just navigates to a new URL.
export function CompareControls({
  options,
  selectedIds,
  selectedNames,
  showAll,
  featured,
}: {
  options: Option[];
  selectedIds: string[];
  selectedNames: Record<string, string>;
  showAll: boolean;
  // Counts for the "include all" toggle; null before the featured list exists.
  featured: { shown: number; all: number } | null;
}) {
  const router = useRouter();
  const nameOf = (id: string) => selectedNames[id] ?? options.find((o) => o.id === id)?.name ?? "Unknown";
  const full = selectedIds.length >= MAX_COMPARE;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedIds.map((id) => (
          <Badge key={id} variant="secondary" className="gap-1 py-1 pr-1 pl-2.5">
            {nameOf(id)}
            <button
              type="button"
              aria-label={`Remove ${nameOf(id)} from comparison`}
              onClick={() => router.push(compareUrl(selectedIds.filter((x) => x !== id), showAll))}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Select
        // Reset after each pick, so the dropdown is always ready to add another.
        value=""
        disabled={full}
        onValueChange={(id) => router.push(compareUrl([...selectedIds, id], showAll))}
      >
        <SelectTrigger className="w-full sm:w-80" aria-label="Add a university to compare">
          <SelectValue
            placeholder={full ? `Up to ${MAX_COMPARE} universities` : "Add a university to compare"}
          />
        </SelectTrigger>
        <SelectContent>
          {options
            .filter((o) => !selectedIds.includes(o.id))
            .map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {featured && (
        <p className="text-sm text-muted-foreground">
          {showAll
            ? `Picking from all ${featured.all.toLocaleString("en-US")} schools. `
            : `Picking from ${featured.shown.toLocaleString("en-US")} featured schools. `}
          <button
            type="button"
            className="underline"
            onClick={() => router.replace(compareUrl(selectedIds, !showAll), { scroll: false })}
          >
            {showAll ? "Show featured only" : `Include all ${featured.all.toLocaleString("en-US")} schools`}
          </button>
        </p>
      )}
    </div>
  );
}
