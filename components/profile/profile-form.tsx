"use client";

import { useActionState } from "react";
import { saveProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tag-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import type { Profile } from "@/lib/types";

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

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={existingProfile?.full_name}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Your country</Label>
          <Input
            id="country"
            name="country"
            defaultValue={existingProfile?.country}
            placeholder="e.g. India"
            required
          />
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
            defaultValue={existingProfile?.gpa_percentage}
            placeholder="e.g. 88.5"
            required
          />
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
            defaultValue={existingProfile?.ielts_score ?? undefined}
            placeholder="e.g. 7.0"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Budget range (USD/year)</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="budget_min"
              type="number"
              min={0}
              step="100"
              defaultValue={existingProfile?.budget_min ?? 0}
              placeholder="Min (optional)"
              aria-label="Minimum budget"
            />
            <Input
              name="budget_max"
              type="number"
              min={0}
              step="100"
              defaultValue={existingProfile?.budget_max}
              placeholder="Max"
              aria-label="Maximum budget"
              required
            />
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="preferred_degree_level">
            Preferred degree level
          </Label>
          <Select
            name="preferred_degree_level"
            defaultValue={existingProfile?.preferred_degree_level ?? "Undergraduate"}
            required
          >
            <SelectTrigger id="preferred_degree_level" className="w-full">
              <SelectValue placeholder="Select a degree level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Undergraduate">Undergraduate</SelectItem>
              <SelectItem value="Masters">Masters</SelectItem>
              <SelectItem value="PhD">PhD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save profile & see recommendations"}
      </Button>
    </form>
  );
}
