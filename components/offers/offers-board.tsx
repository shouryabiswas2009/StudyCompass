"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/applications/status-badge";
import {
  CRITERION_LABELS,
  DEFAULT_OFFER_WEIGHTS,
  defaultOfferWeights,
  focusWeightsNote,
  rankOffers,
  summarizeOffers,
  type OfferCriterion,
  type OfferInput,
  type OfferWeights,
} from "@/lib/offers";
import { formatRank } from "@/lib/matching";
import { usd } from "@/lib/format";
import type { ApplicationStatus, Focus } from "@/lib/types";

// OfferInput plus what this page shows but the ranking doesn't use.
export type OfferRow = OfferInput & {
  universityId: string;
  status: ApplicationStatus;
  netPerYear: number | null;
  durationYears: number;
};

const CRITERIA = Object.keys(DEFAULT_OFFER_WEIGHTS) as OfferCriterion[];

// The ranking itself lives in lib/offers.ts (pure and tested); this
// component only holds the slider values and re-runs it as they move.
// The student's focuses only pick where the sliders start.
export function OffersBoard({ offers, focuses }: { offers: OfferRow[]; focuses: Focus[] }) {
  const defaults = defaultOfferWeights(focuses);
  const [weights, setWeights] = useState<OfferWeights>(defaults);

  const ranked = useMemo(() => rankOffers(offers, weights), [offers, weights]);
  const summary = useMemo(() => summarizeOffers(ranked), [ranked]);
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
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard title="Best overall" name={summary.bestOverall?.universityName} note="for your weights" />
          <SummaryCard
            title="Cheapest"
            name={summary.cheapest?.universityName}
            note={summary.cheapest?.totalCost != null ? `${usd(summary.cheapest.totalCost)} total` : undefined}
          />
          <SummaryCard
            title="Highest ranked"
            name={summary.highestRanked?.universityName}
            note={summary.highestRanked ? `${formatRank(summary.highestRanked.overallRank)} overall` : undefined}
          />
        </div>

        <ol className="space-y-3">
          {ranked.map(({ offer, position, score, reason }) => (
            <li key={offer.id} className="space-y-2 rounded-2xl border p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {position}
                </span>
                <Link href={`/universities/${offer.universityId}`} className="mr-auto font-medium hover:underline">
                  {offer.universityName}
                </Link>
                {offer.status === "accepted" && <StatusBadge status="accepted" />}
                <span className="text-sm font-semibold tabular-nums">{score}/100</span>
              </div>
              <p className="text-sm">{reason}</p>
              <p className="text-xs text-muted-foreground">
                {offer.netPerYear !== null && offer.totalCost !== null
                  ? `${usd(offer.netPerYear)}/yr after scholarship · ${usd(offer.totalCost)} over ${offer.durationYears} years`
                  : "Cost unknown — add tuition and living cost on the Applications page"}
                {" · "}
                {formatRank(offer.overallRank)} overall
                {offer.subjectRank !== null && ` · #${offer.subjectRank} in ${offer.subjectLabel}`}
                {` · ${offer.matchScore}% match`}
              </p>
            </li>
          ))}
        </ol>

        <p className="text-xs text-muted-foreground">
          Each offer gets 0–100 from the criteria above. Costs and rankings are
          compared between your offers (best = full marks), rankings on a log
          scale so #5 vs #10 counts more than #205 vs #210. Research intensity
          (Carnegie classification) and co-op / internships (mandatory,
          optional or none) use fixed scales instead, and are only known for
          some schools. Anything unknown for an offer is left out of its score
          rather than counted as zero.
          {missingCost && " Some offers are missing cost details, so cost can't separate them yet."}
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
