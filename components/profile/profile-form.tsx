"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tag-input";
import { FieldError } from "@/components/field-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import {
  APPROX_NOTE,
  DEFAULT_DISPLAY_CURRENCY,
  DISPLAY_CURRENCIES,
  approxInCurrency,
  currencyName,
} from "@/lib/display-currency";
import { BALANCED_DESCRIPTION, FOCUS_DESCRIPTIONS, FOCUS_LABELS, focusesOf } from "@/lib/focus";
import { DEGREE_LEVELS, FOCUSES, type Profile } from "@/lib/types";

// Common majors offered by the sample universities — just autocomplete
// hints, students can still type anything.
const MAJOR_SUGGESTIONS = [
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

// `existingProfile` is null the first time a student fills this out,
// and populated when they come back to edit it later.
export function ProfileForm({
  existingProfile,
}: {
  existingProfile: Profile | null;
}) {
  const [state, formAction, pending] = useActionState(saveProfile, undefined);
  const errors = state?.fieldErrors ?? {};

  // After a failed save, show what the student just typed; otherwise show
  // their saved profile (or nothing, for a brand-new profile).
  function initial(name: keyof Profile): string | undefined {
    const submitted = state?.values?.[name];
    if (submitted !== undefined) return submitted;
    const saved = existingProfile?.[name];
    return saved === null || saved === undefined ? undefined : String(saved);
  }

  // After a failed save, the boxes the student just ticked; otherwise their
  // saved focuses (also read from the old single choice before migration 009).
  const checkedFocuses: string[] =
    state?.focuses ?? (existingProfile ? focusesOf(existingProfile) : []);

  // For the "≈ in your currency" line under the budget, updated as they type.
  const [currency, setCurrency] = useState(existingProfile?.display_currency ?? DEFAULT_DISPLAY_CURRENCY);
  const [budgetMax, setBudgetMax] = useState(initial("budget_max") ?? "");
  const budgetInCurrency = approxInCurrency(Number(budgetMax) || null, currency);

  return (
    // noValidate: let the server's messages (lib/profile-validation.ts) be
    // the single source of error text, instead of mixing in the browser's.
    <form action={formAction} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={initial("full_name")}
            aria-invalid={!!errors.full_name}
          />
          <FieldError message={errors.full_name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Your country</Label>
          <Input
            id="country"
            name="country"
            defaultValue={initial("country")}
            placeholder="e.g. India"
            aria-invalid={!!errors.country}
          />
          <FieldError message={errors.country} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gpa_percentage">High school GPA / percentage</Label>
          <Input
            id="gpa_percentage"
            name="gpa_percentage"
            type="number"
            step="0.01"
            min={0}
            max={100}
            defaultValue={initial("gpa_percentage")}
            placeholder="e.g. 88.5"
            aria-invalid={!!errors.gpa_percentage}
          />
          <FieldError message={errors.gpa_percentage} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="intended_majors">Intended majors</Label>
          <TagInput
            id="intended_majors"
            name="intended_majors"
            defaultValues={existingProfile?.intended_majors}
            suggestions={MAJOR_SUGGESTIONS}
            placeholder="Type a major and press Enter"
          />
          <FieldError message={errors.intended_majors} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="preferred_countries">Preferred study countries</Label>
          <TagInput
            id="preferred_countries"
            name="preferred_countries"
            defaultValues={existingProfile?.preferred_countries}
            suggestions={COUNTRY_OPTIONS}
            placeholder="Type a country and press Enter"
          />
          <FieldError message={errors.preferred_countries} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ielts_score">IELTS score (optional)</Label>
          <Input
            id="ielts_score"
            name="ielts_score"
            type="number"
            step="0.5"
            min={0}
            max={9}
            defaultValue={initial("ielts_score")}
            placeholder="e.g. 7.0"
            aria-invalid={!!errors.ielts_score}
          />
          <FieldError message={errors.ielts_score} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sat_score">SAT score (optional)</Label>
          <Input
            id="sat_score"
            name="sat_score"
            type="number"
            step="10"
            min={400}
            max={1600}
            defaultValue={initial("sat_score")}
            placeholder="e.g. 1350"
            aria-invalid={!!errors.sat_score}
          />
          <FieldError message={errors.sat_score} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Budget range (USD/year)</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="budget_min"
              type="number"
              min={0}
              step="100"
              defaultValue={initial("budget_min") ?? "0"}
              placeholder="Min (optional)"
              aria-label="Minimum budget"
              aria-invalid={!!errors.budget_min}
            />
            <Input
              name="budget_max"
              type="number"
              min={0}
              step="100"
              defaultValue={initial("budget_max")}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="Max"
              aria-label="Maximum budget"
              aria-invalid={!!errors.budget_max}
            />
          </div>
          <FieldError message={errors.budget_min ?? errors.budget_max} />
          {budgetInCurrency && (
            <p className="text-xs text-muted-foreground">
              Up to {budgetInCurrency} a year ({APPROX_NOTE}).
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="display_currency">Also show amounts in</Label>
          <Select name="display_currency" value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="display_currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code === "USD" ? "US dollars only" : currencyName(code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Budgets and costs stay in US dollars; we add an approximate amount in this currency next to them,
            at the European Central Bank rates of one day (shown with each amount).
          </p>
          <FieldError message={errors.display_currency} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="preferred_degree_level">
            Preferred degree level
          </Label>
          <Select
            name="preferred_degree_level"
            defaultValue={existingProfile?.preferred_degree_level ?? "Undergraduate"}
          >
            <SelectTrigger id="preferred_degree_level" className="w-full">
              <SelectValue placeholder="Select a degree level" />
            </SelectTrigger>
            <SelectContent>
              {DEGREE_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.preferred_degree_level} />
        </div>

        {/* Plain checkboxes: tick any number, every option and its meaning
            visible at once, and it works without JavaScript. */}
        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="text-sm font-medium">What matters most to you? (tick any)</legend>
          <p className="text-sm text-muted-foreground">
            This changes how universities are scored and where the sliders
            start on the offers page. {BALANCED_DESCRIPTION}
          </p>
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            {FOCUSES.map((focus) => (
              <label
                key={focus}
                className="flex cursor-pointer gap-3 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="checkbox"
                  name="focuses"
                  value={focus}
                  defaultChecked={checkedFocuses.includes(focus)}
                  className="mt-1 size-4 accent-primary"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{FOCUS_LABELS[focus]}</span>
                  <span className="block text-xs text-muted-foreground">
                    {FOCUS_DESCRIPTIONS[focus]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError message={errors.focuses} />
        </fieldset>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.notice && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{state.notice}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save profile & see recommendations"}
      </Button>
    </form>
  );
}
