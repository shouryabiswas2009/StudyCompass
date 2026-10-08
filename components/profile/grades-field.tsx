"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/field-error";
import {
  GRADE_SYSTEM_INFO,
  filterGradeSystems,
  gradeToPercentage,
  groupedGradeSystems,
  inputAfterSystemChange,
  type GradeSystem,
} from "@/lib/grades";

const BASIS_TEXT = { exact: "exact", converted: "converted", approximate: "approximate" } as const;
const selectClass =
  "h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

// "Your grades": pick a grading system (grouped, filterable, the student's
// own country first), enter the grades, and see the percentage the app will
// use and how it was obtained. The server converts again when saving
// (lib/profile-validation.ts). A native <select> keeps it light and fully
// keyboard-usable.
export function GradesField({
  initialSystem,
  initialInput,
  initialPercentage,
  homeCountry,
  errors,
}: {
  initialSystem: GradeSystem;
  initialInput: string | undefined;
  initialPercentage: string | undefined;
  homeCountry?: string | null;
  errors: { grade_system?: string; grade_input?: string; gpa_percentage?: string };
}) {
  const [system, setSystem] = useState<GradeSystem>(initialSystem);
  const [query, setQuery] = useState("");
  const [input, setInput] = useState(initialInput ?? "");
  const [percentage, setPercentage] = useState(initialPercentage ?? "");
  const info = GRADE_SYSTEM_INFO[system];
  const converts = info.entry !== "percentage";
  const typed = converts ? input : percentage;
  const result = typed.trim() ? gradeToPercentage(system, typed) : null;

  const groups = groupedGradeSystems(homeCountry)
    .map((g) => ({ ...g, systems: filterGradeSystems(query, g.systems) }))
    .filter((g) => g.systems.length > 0);
  // The chosen system always stays in the list, even when filtered out.
  const visible = new Set(groups.flatMap((g) => g.systems));

  function choose(next: GradeSystem) {
    // Keep what was typed only if it means the same thing in the new system.
    setInput(inputAfterSystemChange(system, next, input));
    setPercentage(inputAfterSystemChange(system, next, percentage));
    setSystem(next);
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="grade_system">Grading system</Label>
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter: Ontario, IB…"
          aria-label="Filter grading systems"
          className="h-11"
        />
        <select id="grade_system" name="grade_system" value={system} onChange={(e) => choose(e.target.value as GradeSystem)} className={selectClass}>
          {!visible.has(system) && <option value={system}>{info.label}</option>}
          {groups.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.systems.map((s) => (
                <option key={s} value={s}>
                  {GRADE_SYSTEM_INFO[s].label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <FieldError message={errors.grade_system} />

      <div className="space-y-1.5 pt-2">
        <Label htmlFor={converts ? "grade_input" : "gpa_percentage"}>{info.inputLabel}</Label>
        <p className="text-xs text-muted-foreground">{info.hint}</p>
        {converts ? (
          <Input id="grade_input" name="grade_input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={info.placeholder} aria-invalid={!!errors.grade_input} className="h-11" />
        ) : (
          <Input
            id="gpa_percentage"
            name="gpa_percentage"
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder={info.placeholder}
            aria-invalid={!!errors.gpa_percentage}
            className="h-11"
          />
        )}
        <FieldError message={converts ? errors.grade_input : errors.gpa_percentage} />
        <p className="text-sm" aria-live="polite">
          {result?.ok ? (
            <>
              <span className="font-medium">
                {result.basis === "exact" ? "" : "≈ "}
                {result.percentage}%
              </span>{" "}
              <span className="text-muted-foreground">({BASIS_TEXT[result.basis]})</span>
            </>
          ) : result ? (
            <span className="text-destructive">{result.error}</span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {info.help}
          {info.source && (
            <>
              {" "}
              {info.basis === "converted" ? "Source" : "See"}:{" "}
              <a href={info.source.url} target="_blank" rel="noopener noreferrer" className="underline">
                {info.source.name}
              </a>
              .
            </>
          )}
        </p>
      </div>
    </div>
  );
}
