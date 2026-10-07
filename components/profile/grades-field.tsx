"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/field-error";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADE_SYSTEMS, GRADE_SYSTEM_INFO, gradeToPercentage, type GradeSystem } from "@/lib/grades";

// "Your grades" on the profile: pick a grading system, enter the grades,
// and see the percentage the app will use, with where the conversion comes
// from. The server converts again when saving (lib/profile-validation.ts).
export function GradesField({
  initialSystem,
  initialInput,
  initialPercentage,
  errors,
}: {
  initialSystem: GradeSystem;
  initialInput: string | undefined;
  initialPercentage: string | undefined;
  errors: { grade_system?: string; grade_input?: string; gpa_percentage?: string };
}) {
  const [system, setSystem] = useState<GradeSystem>(initialSystem);
  const [input, setInput] = useState(initialInput ?? "");
  const info = GRADE_SYSTEM_INFO[system];
  const converts = info.basis === "converted";
  const result = converts && input.trim() ? gradeToPercentage(system, input) : null;

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="grade_system">Your grades</Label>
      <Select name="grade_system" value={system} onValueChange={(v) => setSystem(v as GradeSystem)}>
        <SelectTrigger id="grade_system" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GRADE_SYSTEMS.map((s) => (
            <SelectItem key={s} value={s}>
              {GRADE_SYSTEM_INFO[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError message={errors.grade_system} />

      <div className="space-y-1.5 pt-1">
        <Label htmlFor={converts ? "grade_input" : "gpa_percentage"} className="text-sm font-normal text-muted-foreground">
          {info.inputLabel}
        </Label>
        {converts ? (
          <Input
            key={system}
            id="grade_input"
            name="grade_input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={info.placeholder}
            aria-invalid={!!errors.grade_input}
          />
        ) : (
          <Input
            id="gpa_percentage"
            name="gpa_percentage"
            type="number"
            step="0.01"
            min={0}
            max={100}
            defaultValue={initialPercentage}
            placeholder={info.placeholder}
            aria-invalid={!!errors.gpa_percentage}
          />
        )}
        <FieldError message={converts ? errors.grade_input : errors.gpa_percentage} />
        {result?.ok && (
          <p className="text-sm font-medium" aria-live="polite">
            = {result.percentage}% (used for matching)
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {info.help}
          {info.basis === "approximate" && " It'll show as approximate wherever it's used."}
          {info.source && (
            <>
              {" "}
              {converts ? "Source" : "Guidance only"}:{" "}
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
