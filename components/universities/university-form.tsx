"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/tag-input";
import { FieldError } from "@/components/field-error";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import Link from "next/link";
import { RESEARCH_LABELS } from "@/lib/focus";
import { DEGREE_LEVELS, RESEARCH_INTENSITIES, type University } from "@/lib/types";
import type { UniversityFormState } from "@/lib/actions/universities";

type Action = (state: UniversityFormState, formData: FormData) => Promise<UniversityFormState>;

const PROGRAM_SUGGESTIONS = [
  "Computer Science",
  "Business",
  "Engineering",
  "Data Science",
  "Medicine",
  "Law",
  "Economics",
  "Arts",
  "Mathematics",
  "Architecture",
];

// Used for both adding and editing. `existing` is the school being edited,
// or undefined when adding a new one.
export function UniversityForm({
  action,
  existing,
  submitLabel,
}: {
  action: Action;
  existing?: University;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.fieldErrors ?? {};
  const countryListId = useId();

  // After a failed save, show what was just typed; otherwise the saved values.
  function initial(name: keyof University): string | undefined {
    const submitted = state?.values?.[name];
    if (submitted !== undefined) return submitted;
    const saved = existing?.[name];
    return saved === null || saved === undefined ? undefined : String(saved);
  }

  const checkedLevels: string[] = state?.degreeLevels ?? existing?.degree_levels ?? [];

  return (
    <form action={formAction} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">University name</Label>
          <Input id="name" name="name" defaultValue={initial("name")} aria-invalid={!!errors.name} />
          <FieldError message={errors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            list={countryListId}
            defaultValue={initial("country")}
            aria-invalid={!!errors.country}
          />
          <datalist id={countryListId}>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <FieldError message={errors.country} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tuition">Tuition (USD per year)</Label>
          <Input
            id="tuition"
            name="tuition"
            type="number"
            min={0}
            step={100}
            defaultValue={initial("tuition")}
            aria-invalid={!!errors.tuition}
          />
          <FieldError message={errors.tuition} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="qs_ranking">QS ranking (optional)</Label>
          <Input
            id="qs_ranking"
            name="qs_ranking"
            type="number"
            min={1}
            step={1}
            defaultValue={initial("qs_ranking")}
            placeholder="Leave blank if unranked"
            aria-invalid={!!errors.qs_ranking}
          />
          <FieldError message={errors.qs_ranking} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="acceptance_rate">Acceptance rate (%)</Label>
          <Input
            id="acceptance_rate"
            name="acceptance_rate"
            type="number"
            min={0}
            max={100}
            step={0.1}
            defaultValue={initial("acceptance_rate")}
            aria-invalid={!!errors.acceptance_rate}
          />
          <FieldError message={errors.acceptance_rate} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="popular_programs">Popular programs</Label>
          <TagInput
            id="popular_programs"
            name="popular_programs"
            defaultValues={existing?.popular_programs}
            suggestions={PROGRAM_SUGGESTIONS}
            placeholder="Type a program and press Enter"
          />
          <FieldError message={errors.popular_programs} />
        </div>

        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="text-sm font-medium">Degree levels offered</legend>
          <div className="flex flex-wrap gap-4">
            {DEGREE_LEVELS.map((level) => (
              <label key={level} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="degree_levels"
                  value={level}
                  defaultChecked={checkedLevels.includes(level)}
                  className="size-4 accent-primary"
                />
                {level}
              </label>
            ))}
          </div>
          <FieldError message={errors.degree_levels} />
        </fieldset>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div>
          <h2 className="font-medium">Admission figures (optional)</h2>
          <p className="text-sm text-muted-foreground">
            Leave anything you don&apos;t know blank — it&apos;s treated as
            unknown and won&apos;t count against the school&apos;s score.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="avg_admitted_gpa">Typical admitted GPA (0–100)</Label>
            <Input
              id="avg_admitted_gpa"
              name="avg_admitted_gpa"
              type="number"
              min={0}
              max={100}
              step={0.1}
              defaultValue={initial("avg_admitted_gpa")}
              aria-invalid={!!errors.avg_admitted_gpa}
            />
            <FieldError message={errors.avg_admitted_gpa} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_ielts">Minimum IELTS</Label>
            <Input
              id="min_ielts"
              name="min_ielts"
              type="number"
              min={0}
              max={9}
              step={0.5}
              defaultValue={initial("min_ielts")}
              aria-invalid={!!errors.min_ielts}
            />
            <FieldError message={errors.min_ielts} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>SAT middle-50% range</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="sat_25"
                type="number"
                min={400}
                max={1600}
                step={10}
                defaultValue={initial("sat_25")}
                placeholder="25th percentile"
                aria-label="SAT 25th percentile"
                aria-invalid={!!errors.sat_25}
              />
              <Input
                name="sat_75"
                type="number"
                min={400}
                max={1600}
                step={10}
                defaultValue={initial("sat_75")}
                placeholder="75th percentile"
                aria-label="SAT 75th percentile"
                aria-invalid={!!errors.sat_25}
              />
            </div>
            <FieldError message={errors.sat_25} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="living_cost_per_year">Living cost (USD per year)</Label>
            <Input
              id="living_cost_per_year"
              name="living_cost_per_year"
              type="number"
              min={0}
              step={100}
              defaultValue={initial("living_cost_per_year")}
              aria-invalid={!!errors.living_cost_per_year}
            />
            <FieldError message={errors.living_cost_per_year} />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div>
          <h2 className="font-medium">Research and work experience (optional)</h2>
          <p className="text-sm text-muted-foreground">
            Used when a student&apos;s focus is research or work experience.
            Pick &ldquo;Not sure&rdquo; unless the university says so itself.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Native selects: simple, and they reset cleanly with the form. */}
          <div className="space-y-2">
            <Label htmlFor="research_intensity">Research activity (Carnegie classification)</Label>
            <select
              id="research_intensity"
              name="research_intensity"
              defaultValue={initial("research_intensity") ?? ""}
              aria-invalid={!!errors.research_intensity}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Not sure</option>
              {RESEARCH_INTENSITIES.map((level) => (
                <option key={level} value={level}>
                  {RESEARCH_LABELS[level]}
                </option>
              ))}
            </select>
            <FieldError message={errors.research_intensity} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coop_program">Co-op / internship program</Label>
            <select
              id="coop_program"
              name="coop_program"
              defaultValue={initial("coop_program") ?? "unknown"}
              aria-invalid={!!errors.coop_program}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="unknown">Not sure</option>
              <option value="mandatory">Mandatory co-op (every student does one)</option>
              <option value="optional">Optional co-op / internship program</option>
              <option value="none">No co-op program</option>
            </select>
            <FieldError message={errors.coop_program} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="internship_support_url">Co-op / internship page (optional)</Label>
            <Input
              id="internship_support_url"
              name="internship_support_url"
              type="url"
              defaultValue={initial("internship_support_url")}
              placeholder="https://www.university.edu/co-op"
              aria-invalid={!!errors.internship_support_url}
            />
            <FieldError message={errors.internship_support_url} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial("description")}
          aria-invalid={!!errors.description}
        />
        <FieldError message={errors.description} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="source_url">Where did these figures come from? (optional)</Label>
        <Input
          id="source_url"
          name="source_url"
          type="url"
          defaultValue={initial("source_url")}
          placeholder="https://www.university.edu/admissions"
          aria-invalid={!!errors.source_url}
        />
        <p className="text-xs text-muted-foreground">
          A link to the university&apos;s own page lets you (and anyone you
          show this to) check the numbers later. It&apos;s shown next to the
          figures.
        </p>
        <FieldError message={errors.source_url} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.notice && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {state.notice}{" "}
          {state.savedId && (
            <Link href={`/universities/mine/${state.savedId}`} className="underline">
              View the university
            </Link>
          )}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
