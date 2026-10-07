"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, RotateCcw, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/applications/status-badge";
import {
  CRITERION_LABELS,
  DEFAULT_OFFER_WEIGHTS,
  SENSITIVITY_SPREAD,
  acceptByStatus,
  defaultOfferWeights,
  offerSensitivity,
  focusWeightsNote,
  rankOffers,
  summarizeOffers,
  type OfferCriterion,
  type OfferInput,
  type OfferWeights,
} from "@/lib/offers";
import { formatRank } from "@/lib/matching";
import { usd } from "@/lib/format";
import { APPROX_NOTE, approxInCurrency } from "@/lib/display-currency";
import type { ApplicationStatus, Focus } from "@/lib/types";

// OfferInput plus what this page shows but the ranking doesn't use.
export type OfferRow = OfferInput & {
  universityId: string;
  status: ApplicationStatus;
  netPerYear: number | null;
  durationYears: number;
  acceptBy: string | null; // "YYYY-MM-DD", optional
};

const CRITERIA = Object.keys(DEFAULT_OFFER_WEIGHTS) as OfferCriterion[];

// The ranking itself lives in lib/offers.ts (pure and tested); this
// component only holds the slider values and re-runs it as they move.
// The student's focuses only pick where the sliders start.
export function OffersBoard({
  offers,
  focuses,
  displayCurrency,
}: {
  offers: OfferRow[];
  focuses: Focus[];
  displayCurrency?: string;
}) {
  // "$60,000 (≈ ₹5,780,000)" when the student shows another currency too.
  const money = (amount: number) => {
    const other = approxInCurrency(amount, displayCurrency);
    return other ? `${usd(amount)} (${other})` : usd(amount);
  };
  const defaults = defaultOfferWeights(focuses);
  const [weights, setWeights] = useState<OfferWeights>(defaults);

  const ranked = useMemo(() => rankOffers(offers, weights), [offers, weights]);
  const summary = useMemo(() => summarizeOffers(ranked), [ranked]);
  // 1,000 re-rankings with jiggled weights (seeded, so stable between renders).
  const sensitivity = useMemo(() => offerSensitivity(offers, weights), [offers, weights]);
  const robustness = new Map(sensitivity.offers.map((o) => [o.id, o]));
  const pct = (share: number) => `${Math.round(share * 100)}%`;
  const missingCost = offers.some((o) => o.totalCost === null);

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4 rounded-2xl border p-5 lg:sticky lg:top-24 lg:self-start">
        <div>
          <h2 className="font-medium">What matters to you?</h2>
          <p className="text-sm text-muted-foreground">
            0 = ignore, 10 = matters most. The ranking updates as you move them.
          </p>
          <p className="mt-2 text-sm">
            {focusWeightsNote(focuses)}{" "}
            <Link href="/profile" className="text-muted-foreground underline">
              Change your focuses
            </Link>
          </p>
        </div>
        {CRITERIA.map((key) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <label htmlFor={`weight-${key}`}>{CRITERION_LABELS[key]}</label>
              <span className="font-medium tabular-nums">{weights[key]}</span>
            </div>
            <input
              id={`weight-${key}`}
              type="range"
              min={0}
              max={10}
              step={1}
              value={weights[key]}
              onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeights(defaults)}
          className="-ml-2"
        >
          <RotateCcw className="size-4" />
          Reset to defaults
        </Button>
      </aside>

      <div className="space-y-6">
        {approxInCurrency(1, displayCurrency) && (
          <p className="text-xs text-muted-foreground">Amounts after &ldquo;≈&rdquo; are in {displayCurrency}, {APPROX_NOTE}.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard title="Best overall" name={summary.bestOverall?.universityName} note="for your weights" />
          <SummaryCard
            title="Cheapest"
            name={summary.cheapest?.universityName}
            note={summary.cheapest?.totalCost != null ? `${money(summary.cheapest.totalCost)} total` : undefined}
          />
          <SummaryCard
            title="Highest ranked"
            name={summary.highestRanked?.universityName}
            note={summary.highestRanked ? `${formatRank(summary.highestRanked.overallRank)} overall` : undefined}
          />
        </div>

        {sensitivity.verdict && (
          <div
            className={
              sensitivity.verdict.kind === "clear"
                ? "flex gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"
                : "flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm"
            }
            aria-live="polite"
          >
            {sensitivity.verdict.kind === "clear" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            ) : (
              <Scale className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            )}
            <p>{sensitivity.verdict.message}</p>
          </div>
        )}

        <ol className="space-y-3">
          {ranked.map(({ offer, position, score, reason }) => {
            const due = acceptByStatus(offer.acceptBy, offer.status);
            const spread = robustness.get(offer.id);
            return (
            <li key={offer.id} className="space-y-2 rounded-2xl border p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {position}
                </span>
                <Link href={`/universities/${offer.universityId}`} className="mr-auto font-medium hover:underline">
                  {offer.universityName}
                </Link>
                {offer.status === "accepted" && <StatusBadge status="accepted" />}
                {due && (
                  <span
                    className={
                      due.state === "overdue"
                        ? "inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-600 dark:text-rose-400"
                        : due.state === "due-soon"
                          ? "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400"
                          : "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
                    }
                  >
                    {due.state === "overdue" ? (
                      <AlertTriangle className="size-3" aria-hidden />
                    ) : (
                      <CalendarClock className="size-3" aria-hidden />
                    )}
                    {due.label}
                  </span>
                )}
                <span className="text-sm font-semibold tabular-nums">{score}/100</span>
              </div>
              <p className="text-sm">{reason}</p>
              <p className="text-xs text-muted-foreground">
                {offer.netPerYear !== null && offer.totalCost !== null
                  ? `${money(offer.netPerYear)}/yr after scholarship · ${money(offer.totalCost)} over ${offer.durationYears} years`
                  : "Cost unknown — add tuition and living cost on the Applications page"}
                {" · "}
                {formatRank(offer.overallRank)} overall
                {offer.subjectRank !== null && ` · #${offer.subjectRank} in ${offer.subjectLabel}`}
                {` · research impact (Leiden Ranking / OpenAlex): ${offer.researchImpactLabel ?? "not available"}`}
                {` · ${offer.matchScore}% match`}
              </p>
              {spread && offers.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  First in {pct(spread.firstShare)} of {sensitivity.runs.toLocaleString("en-US")} variations · rank
                  spread:{" "}
                  {spread.rankShares
                    .map((share, i) => ({ share, rank: i + 1 }))
                    .filter(({ share }) => share > 0)
                    .map(({ share, rank }) => `#${rank} ${pct(share)}`)
                    .join(" · ")}
                </p>
              )}
            </li>
            );
          })}
        </ol>

        <p className="text-xs text-muted-foreground">
          Each offer gets 0–100 from the criteria above. Costs and rankings are
          compared between your offers (best = full marks), rankings on a log
          scale so #5 vs #10 counts more than #205 vs #210. Research intensity
          (Carnegie classification) and co-op / internships (mandatory,
          optional or none) use fixed scales instead, and are only known for
          some schools. Anything unknown for an offer is left out of its score
          rather than counted as zero.
          {missingCost && " Some offers are missing cost details, so cost can't separate them yet."}{" "}
          &ldquo;Clear winner&rdquo; / &ldquo;close call&rdquo;: the ranking is
          re-run {sensitivity.runs.toLocaleString("en-US")} times with every
          non-zero slider moved randomly by up to ±{Math.round(SENSITIVITY_SPREAD * 100)}%,
          counting how often each offer comes first.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ title, name, note }: { title: string; name?: string; note?: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="font-medium">{name ?? "—"}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
