"use client";

import { useState } from "react";
import { FieldError } from "@/components/field-error";
import { STAY_AFTER, STAY_AFTER_LABELS, VISA_MODES, VISA_MODE_LABELS, VISA_WEIGHTS, type VisaMode } from "@/lib/visa";
import type { Profile } from "@/lib/types";

const MODE_HELP: Record<VisaMode, string> = {
  ignore: "Visa rules don't affect any score or order.",
  show: "See each country's post-study work, proof of funds and work hours on cards, compare and offers. Scores stay the same.",
  factor: "Also count them in your match score and in “Best you can get into”, as much as you choose below.",
};

// "Visa and work rights" on the profile. Plain radio buttons (they work
// without JavaScript); the weight and the stay question only appear when
// the student chooses to factor the visa in.
export function VisaFields({
  profile,
  errors,
}: {
  profile: Pick<Profile, "visa_mode" | "visa_weight" | "stay_after"> | null;
  errors: { visa_mode?: string; visa_weight?: string; stay_after?: string };
}) {
  const [mode, setMode] = useState<VisaMode>(profile?.visa_mode ?? "ignore");
  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="text-sm font-medium">Visa and work rights</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {VISA_MODES.map((m) => (
          <label key={m} className="flex cursor-pointer gap-2 rounded-md border p-3 has-[:checked]:border-primary">
            <input type="radio" name="visa_mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-1 accent-primary" />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">{VISA_MODE_LABELS[m]}</span>
              <span className="block text-xs text-muted-foreground">{MODE_HELP[m]}</span>
            </span>
          </label>
        ))}
      </div>
      <FieldError message={errors.visa_mode} />

      {mode === "factor" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-sm">How much should it count?</span>
            <div className="flex gap-3">
              {VISA_WEIGHTS.map((w) => (
                <label key={w} className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="visa_weight" value={w} defaultChecked={(profile?.visa_weight ?? "medium") === w} className="accent-primary" />
                  {w[0].toUpperCase() + w.slice(1)}
                </label>
              ))}
            </div>
            <FieldError message={errors.visa_weight} />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm">Do you plan to work or stay in the country after graduating?</span>
            <div className="flex flex-wrap gap-3">
              {STAY_AFTER.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="stay_after" value={s} defaultChecked={profile?.stay_after === s} className="accent-primary" />
                  {STAY_AFTER_LABELS[s]}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              &ldquo;No&rdquo; leaves the post-study work window out of your visa score; &ldquo;Not sure&rdquo; counts it half.
            </p>
            <FieldError message={errors.stay_after} />
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Only figures copied from government pages are used (post-study work, proof of funds, work hours), never an
        &ldquo;approval chance&rdquo;. Rules can differ by nationality, so this is general guidance, not legal advice.
      </p>
    </fieldset>
  );
}
