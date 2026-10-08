"use client";

import { createContext, useActionState, useContext, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { saveProfile, saveProfileSection, type ProfileFormState, type SectionState } from "@/lib/actions/profile";
import type { ProfileFieldErrors } from "@/lib/profile-validation";
import type { ProfileSection } from "@/lib/profile-sections";

// How the profile page saves. Normally each section is its own small form
// with a Save button and a visible status ("Saving…", "Saved ✓", "Couldn't
// save"), so a student can fix one thing without touching the rest. For a
// brand-new profile (or a preset being applied) the required fields are
// spread over several sections, so the whole page is ONE form instead:
// CombinedProfileForm provides it, and the sections render inside it.

export type FieldState = { errors: ProfileFieldErrors; values?: Record<string, string> };

const Combined = createContext<FieldState | null>(null);

export function CombinedProfileForm({ children, submitLabel }: { children: ReactNode; submitLabel: string }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, undefined);
  return (
    // noValidate: the server's messages are the single source of error text.
    <form action={action} noValidate>
      <Combined.Provider value={{ errors: state?.fieldErrors ?? {}, values: state?.values }}>{children}</Combined.Provider>
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background px-4 py-4 sm:mx-0 sm:px-0">
        <Button type="submit" size="lg" disabled={pending} className="min-h-11">
          {pending ? "Saving…" : submitLabel}
        </Button>
        <p aria-live="polite" className="text-sm">
          {state?.error && <span className="text-destructive">{state.error}</span>}
          {state?.notice && <span className="text-amber-700 dark:text-amber-400">{state.notice}</span>}
        </p>
      </div>
    </form>
  );
}

export function SectionForm({
  section,
  label,
  children,
}: {
  section: ProfileSection;
  label: string;
  children: (state: FieldState) => ReactNode;
}) {
  const combined = useContext(Combined);
  if (combined) return <>{children(combined)}</>;
  return <StandaloneSection section={section} label={label}>{children}</StandaloneSection>;
}

function StandaloneSection({ section, label, children }: { section: ProfileSection; label: string; children: (state: FieldState) => ReactNode }) {
  const [state, action, pending] = useActionState<SectionState, FormData>(saveProfileSection, undefined);
  return (
    <form action={action} noValidate className="space-y-6">
      <input type="hidden" name="section" value={section} />
      {children({ errors: state?.fieldErrors ?? {}, values: state?.values })}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending} className="min-h-11">
          {pending ? "Saving…" : `Save ${label}`}
        </Button>
        <p aria-live="polite" className="text-sm">
          {pending ? (
            <span className="text-muted-foreground">Saving…</span>
          ) : state?.ok ? (
            <span className="text-emerald-700 dark:text-emerald-400">Saved ✓</span>
          ) : state?.error ? (
            <span className="text-destructive">Couldn&apos;t save: {state.error}</span>
          ) : null}
          {state?.notice && <span className="ml-2 text-amber-700 dark:text-amber-400">{state.notice}</span>}
        </p>
      </div>
    </form>
  );
}
