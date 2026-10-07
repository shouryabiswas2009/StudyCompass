import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import { Flag } from "@/components/flag";
import { SectionHeading } from "@/components/landing/section-heading";
import { checkAge, guidanceItems, type CountryInfo } from "@/lib/country-info";
import { explainMatch } from "@/lib/matching";
import { signed } from "@/lib/what-if";
import { SAMPLE_PROFILE, SAMPLE_PROFILE_SUMMARY, type ExampleMatch, type ExampleWhatIf } from "@/lib/landing";

// The "featured" row: three cards, each with a small drawing of a real
// screen filled in with real computed data for a made-up sample student
// (lib/landing.ts). Nothing here is a stock photo or an invented number.
export function ScreenPreviews({
  match,
  whatIf,
  visa,
}: {
  match: ExampleMatch | null;
  whatIf: ExampleWhatIf | null;
  visa: CountryInfo | null;
}) {
  // Plain cards (no links): these screens are members-only, and the landing
  // page keeps just three ways in.
  const cards: { title: string; tag: string; screen: ReactNode }[] = [];
  if (match) cards.push({ title: "Matches, with the reasons", tag: "Recommendations", screen: <MatchScreen match={match} /> });
  if (whatIf) cards.push({ title: "What if? sliders", tag: "University details", screen: <WhatIfScreen whatIf={whatIf} /> });
  if (visa) cards.push({ title: "Visas and post-study work", tag: "Country guidance", screen: <VisaScreen info={visa} /> });
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="previews-heading" className="page-container section-y pt-0">
      <SectionHeading
        id="previews-heading"
        eyebrow="See it in action"
        title="Real screens, real numbers"
        accent="real numbers"
        description={`Examples for a sample student (${SAMPLE_PROFILE_SUMMARY}). Yours will differ.`}
      />
      <ul className="mt-8 grid gap-5 md:grid-cols-3">
        {cards.map((card) => (
          <li key={card.title} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
            <div className="bg-muted p-4 sm:p-5">
              <div className="rounded-xl border bg-card p-4 shadow-sm" aria-hidden>
                <div className="mb-3 flex gap-1.5">
                  <span className="size-2 rounded-full bg-border" />
                  <span className="size-2 rounded-full bg-border" />
                  <span className="size-2 rounded-full bg-border" />
                </div>
                {card.screen}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-5">
              <div>
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.tag}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExampleTag() {
  return <span className="rounded-full bg-tint px-2 py-0.5 text-[0.65rem] font-semibold text-tint-foreground">Example</span>;
}

function MatchScreen({ match }: { match: ExampleMatch }) {
  const { strengths, concerns } = explainMatch(SAMPLE_PROFILE, match.university);
  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold">
          <Flag country={match.university.country} />
          <span className="truncate">{match.university.name}</span>
        </span>
        <ExampleTag />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${match.score}%` }} />
        </div>
        <span className="font-heading text-base font-extrabold tabular-nums">{match.score}</span>
      </div>
      <ul className="space-y-1.5 text-muted-foreground">
        {strengths.slice(0, 2).map((line) => (
          <li key={line} className="flex gap-1.5"><Check className="mt-px size-3 shrink-0 text-primary" />{line}</li>
        ))}
        {concerns.slice(0, 1).map((line) => (
          <li key={line} className="flex gap-1.5"><Minus className="mt-px size-3 shrink-0" />{line}</li>
        ))}
      </ul>
    </div>
  );
}

function WhatIfScreen({ whatIf }: { whatIf: ExampleWhatIf }) {
  const { actual, whatIf: next, scoreChange, probabilityChange } = whatIf.comparison;
  const pct = (p: number | null) => (p === null ? "n/a" : `~${Math.round(p * 100)}%`);
  const position = (sat: number) => `${((sat - 400) / 1200) * 100}%`;
  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{whatIf.university.name}</span>
        <ExampleTag />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-muted-foreground">
          <span>SAT</span>
          <span className="font-semibold text-foreground tabular-nums">{whatIf.satFrom} → {whatIf.satTo}</span>
        </div>
        <div className="relative h-2 rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: position(whatIf.satTo) }} />
          <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card" style={{ left: position(whatIf.satTo) }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted p-2">
          <p className="text-muted-foreground">Match score</p>
          <p className="font-semibold tabular-nums">{actual.score} → {next.score} <span className="text-primary">({signed(scoreChange)})</span></p>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <p className="text-muted-foreground">Admission estimate</p>
          <p className="font-semibold tabular-nums">
            {pct(actual.probability)} → {pct(next.probability)}
            {probabilityChange !== null && <span className="text-primary"> ({signed(probabilityChange)})</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function VisaScreen({ info }: { info: CountryInfo }) {
  const items = guidanceItems(info).filter((item) => item.text);
  return (
    <div className="space-y-2 text-xs">
      <p className="flex items-center gap-1.5 font-semibold">
        <Flag country={info.country} />
        {info.country}
      </p>
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-2 rounded-lg bg-muted px-2 py-1.5">
          <span className="text-muted-foreground">{item.title}</span>
          <span className="font-semibold">{item.headline ?? "See source"}</span>
        </div>
      ))}
      {items[0]?.checkedOn && (
        <p className="text-muted-foreground">Official source, {checkAge(items[0].checkedOn)?.label}</p>
      )}
    </div>
  );
}
