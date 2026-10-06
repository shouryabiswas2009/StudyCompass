"use client";

import { useActionState, useTransition, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/field-error";
import { Flag } from "@/components/flag";
import { StatusBadge, STATUS_LABELS } from "@/components/applications/status-badge";
import { removeApplication, updateApplication } from "@/lib/actions/applications";
import { netCostPerYear, totalProgramCost } from "@/lib/offers";
import { usd } from "@/lib/format";
import { APPLICATION_STATUSES, type Application, type University } from "@/lib/types";

// One tracked application: status, deadline and the offer details used on
// the offers page, editable in place.
export function ApplicationCard({
  application,
  university,
}: {
  application: Application;
  university: Pick<University, "id" | "name" | "country">;
}) {
  const [state, formAction, pending] = useActionState(
    updateApplication.bind(null, application.id),
    undefined
  );
  const [isRemoving, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const errors = state?.fieldErrors ?? {};

  const perYear = netCostPerYear(application);
  const total = totalProgramCost(application);

  function handleRemove() {
    if (!window.confirm(`Stop tracking ${university.name}? Its offer details will be deleted.`)) {
      return;
    }
    startRemove(async () => {
      const result = await removeApplication(application.id);
      if (result.error) setRemoveError(result.error);
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <Link href={`/universities/${university.id}`} className="font-medium hover:underline">
            {university.name}
          </Link>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flag country={university.country} />
            {university.country}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <p className="text-sm text-muted-foreground">
        Net cost:{" "}
        {perYear !== null && total !== null ? (
          <span className="font-medium text-foreground">
            {usd(perYear)}/yr · {usd(total)} over {application.duration_years} years
          </span>
        ) : (
          "add tuition and living cost to see it"
        )}
      </p>

      {/* key: remount with the freshly saved values after each save, so
          React's automatic form reset can't show the old ones. */}
      <form key={application.updated_at} action={formAction} noValidate className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor={`status-${application.id}`}>Status</Label>
            <select
              id={`status-${application.id}`}
              name="status"
              defaultValue={application.status}
              className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <FieldError message={errors.status} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`program-${application.id}`}>Program</Label>
            <Input
              id={`program-${application.id}`}
              name="program"
              defaultValue={application.program}
              placeholder="e.g. BSc Computer Science"
            />
            <FieldError message={errors.program} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`deadline-${application.id}`}>Deadline</Label>
            <Input
              id={`deadline-${application.id}`}
              name="deadline"
              type="date"
              defaultValue={application.deadline ?? ""}
            />
            <FieldError message={errors.deadline} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`accept_by-${application.id}`}>Accept offer by</Label>
            <Input
              id={`accept_by-${application.id}`}
              name="accept_by"
              type="date"
              defaultValue={application.accept_by ?? ""}
              aria-describedby={`accept_by-hint-${application.id}`}
            />
            <p id={`accept_by-hint-${application.id}`} className="text-xs text-muted-foreground">
              Optional, once you have an offer
            </p>
            <FieldError message={errors.accept_by} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <MoneyField id={application.id} name="tuition_per_year" label="Tuition / yr"
            value={application.tuition_per_year} error={errors.tuition_per_year} />
          <MoneyField id={application.id} name="scholarship_per_year" label="Scholarship / yr"
            value={application.scholarship_per_year} error={errors.scholarship_per_year} />
          <MoneyField id={application.id} name="living_cost_per_year" label="Living cost / yr"
            value={application.living_cost_per_year} error={errors.living_cost_per_year} />
          <div className="space-y-1.5">
            <Label htmlFor={`duration_years-${application.id}`}>Length (years)</Label>
            <Input
              id={`duration_years-${application.id}`}
              name="duration_years"
              type="number"
              min={0.5}
              max={10}
              step={0.5}
              defaultValue={application.duration_years}
            />
            <FieldError message={errors.duration_years} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`notes-${application.id}`}>Notes</Label>
          <Textarea id={`notes-${application.id}`} name="notes" rows={2} defaultValue={application.notes} />
          <FieldError message={errors.notes} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={isRemoving}>
            <Trash2 className="size-4" />
            {isRemoving ? "Removing…" : "Stop tracking"}
          </Button>
          {state?.saved && !state.notice && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>
          )}
          {state?.notice && <span className="text-sm text-amber-600 dark:text-amber-400">{state.notice}</span>}
          {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
          {removeError && <span className="text-sm text-destructive">{removeError}</span>}
        </div>
      </form>
    </div>
  );
}

function MoneyField({
  id,
  name,
  label,
  value,
  error,
}: {
  id: string;
  name: string;
  label: string;
  value: number | null;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${name}-${id}`}>{label}</Label>
      <Input
        id={`${name}-${id}`}
        name={name}
        type="number"
        min={0}
        step={100}
        defaultValue={value ?? ""}
        placeholder="USD"
        aria-invalid={!!error}
      />
      <FieldError message={error} />
    </div>
  );
}
