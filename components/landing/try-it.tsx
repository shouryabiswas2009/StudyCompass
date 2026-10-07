"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/flag";
import { SectionHeading } from "@/components/landing/section-heading";
import { guestMatches } from "@/lib/actions/quiz";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { ANY_COUNTRY, QUIZ_BUDGETS, QUIZ_MAJORS } from "@/lib/quiz-options";

const selectClass =
  "h-11 w-full rounded-xl border bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

// Three questions and the visitor's top five matches, no account needed.
// The answers go to a server action that scores featured universities with
// the app's normal scoring and stores nothing.
export function TryIt() {
  const [state, formAction, pending] = useActionState(guestMatches, undefined);
  // Controlled, so the answers stay selected after the results come back.
  const [country, setCountry] = useState<string>(ANY_COUNTRY);
  const [budget, setBudget] = useState("40000");
  const [major, setMajor] = useState("Computer Science");

  return (
    <section id="try-it" aria-labelledby="try-it-heading" className="page-container section-y scroll-mt-16 pt-0">
      <div className="reveal grid gap-8 rounded-3xl border bg-card p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <div>
          <SectionHeading
            id="try-it-heading"
            eyebrow="Try it now, no account"
            title="See your first matches"
            accent="first matches"
            description="Answer three questions and see five real universities that fit. Nothing you enter here is saved."
          />
          {/* Submitted by hand instead of <form action>: React resets a form
              after a form action, and that reset puts dropdowns back to their
              first option even when they're controlled. */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              startTransition(() => formAction(data));
            }}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="quiz-country" className="text-sm font-medium">Where would you like to study?</label>
              <select id="quiz-country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
                <option value={ANY_COUNTRY}>Anywhere</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="quiz-budget" className="text-sm font-medium">Yearly budget (tuition + living), in US dollars</label>
              <select id="quiz-budget" name="budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={selectClass}>
                {QUIZ_BUDGETS.map((budget) => (
                  <option key={budget} value={budget}>Up to ${budget.toLocaleString("en-US")}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="quiz-major" className="text-sm font-medium">What would you like to study?</label>
              <select id="quiz-major" name="major" value={major} onChange={(e) => setMajor(e.target.value)} className={selectClass}>
                {QUIZ_MAJORS.map((major) => (
                  <option key={major} value={major}>{major}</option>
                ))}
              </select>
            </div>
            <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Finding matches…" : "Show my matches"}
              <ArrowRight aria-hidden />
            </Button>
          </form>
        </div>

        <div aria-live="polite" className="flex flex-col">
          {state?.error && <p className="rounded-xl bg-muted p-4 text-sm" role="alert">{state.error}</p>}

          {state?.matches ? (
            <>
              {/* New key per result set, so each new answer replays the fade-in. */}
              <ol key={state.matches.map((m) => m.id).join()} className="space-y-3">
                {state.matches.map((match, i) => (
                  <li key={match.id} className="appear" style={{ "--appear-delay": `${i * 60}ms` } as React.CSSProperties}>
                    <Link
                      href={`/universities/${match.id}`}
                      className="flex items-center gap-4 rounded-2xl border bg-background p-4 transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-semibold text-tint-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{match.name}</span>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Flag country={match.country} />
                          <span className="truncate">{match.city ? `${match.city}, ${match.country}` : match.country}</span>
                          <span aria-hidden>·</span>
                          <span className="shrink-0">{match.tuition}</span>
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-heading text-2xl font-extrabold text-primary tabular-nums">{match.score}</span>
                        <span className="block text-xs text-muted-foreground">
                          {match.knownFactors} of {match.totalFactors} factors
                        </span>
                        <span className="mt-1 block h-1 w-14 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span
                            className="animate-grow-x block h-full rounded-full bg-primary"
                            style={{ width: `${match.score}%`, "--grow-delay": `${150 + i * 60}ms` } as React.CSSProperties}
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                Match scores from these three answers only. Each is scored on the factors known for
                that school (the rest are left out, not counted as zero); schools with unknown
                tuition aren&apos;t shown. Grades, test scores and English count once you add them to
                a free profile, which also unlocks admission estimates.
              </p>
              <Button size="lg" asChild className="mt-4 self-start">
                <Link href="/signup">
                  Sign up to refine these
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </>
          ) : (
            !state?.error && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                <Sparkles className="size-6 text-primary" aria-hidden />
                <p className="max-w-xs text-sm">Your five best matches will appear here, scored on budget, country and subject.</p>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
