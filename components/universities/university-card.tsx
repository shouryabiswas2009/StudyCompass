"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { MatchScoreBadge, matchTier } from "@/components/universities/match-score-badge";
import { ChanceBadge } from "@/components/universities/chance-badge";
import { StrengthsConcerns } from "@/components/universities/strengths-concerns";
import { SaveButton } from "@/components/universities/save-button";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";
import {
  formatRank,
  type DisplayRanking,
  type MatchExplanation,
  type MatchResult,
} from "@/lib/matching";
import { SourceBadge } from "@/components/universities/source-badge";
import { tuitionDisplay } from "@/lib/money";
import { ApplicationStatusControl } from "@/components/applications/application-status-control";
import type { ApplicationStatus } from "@/lib/types";
import type { AdmissionPrediction } from "@/lib/admission-model";
import type { RankInfo } from "@/lib/ranking";
import type { UniversitySummary } from "@/lib/types";

const TIER_BORDER = {
  strong: "border-t-emerald-500",
  moderate: "border-t-amber-500",
  weak: "border-t-border",
} as const;

export function UniversityCard({
  university,
  match,
  explanation,
  ranking,
  prediction,
  rank,
  isSaved = false,
  index = 0,
  compare,
  tracking,
}: {
  university: UniversitySummary;
  match: MatchResult;
  explanation: MatchExplanation;
  ranking?: DisplayRanking;
  prediction?: AdmissionPrediction | null;
  // Quality, chance and the one-line reason (lib/ranking.ts).
  rank?: RankInfo;
  isSaved?: boolean;
  index?: number;
  // Present when the card is shown in a board that supports comparing.
  compare?: { selected: boolean; disabled: boolean; onToggle: () => void };
  // Present on the saved page: the application tracked for this school, or
  // null if it isn't tracked yet.
  tracking?: { application: { id: string; status: ApplicationStatus } | null };
}) {
  const reduceMotion = useReducedMotion();
  const tuition = tuitionDisplay(university);

  return (
    // Fade in, staggered by position but capped at the 8th card so a page
    // never waits on its own animation; skipped entirely for students who
    // turned on "reduce motion" in their operating system.
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05 }}
      className="relative h-full"
    >
      {/* Sibling of the Link (not nested inside it) so the button stays a
          separately clickable element rather than an <a> inside an <a>. */}
      <SaveButton
        universityId={university.id}
        initiallySaved={isSaved}
        className="absolute top-3 right-3 z-10"
      />

      <Link href={`/universities/${university.id}`} className="block h-full">
        <Card
          className={cn(
            "h-full rounded-2xl border-t-4 transition-all hover:-translate-y-0.5 hover:shadow-lg",
            TIER_BORDER[matchTier(match.score)]
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2 pr-10">
              <CardTitle className="text-base leading-snug">
                {university.name}
              </CardTitle>
              <MatchScoreBadge score={match.score} />
            </div>
            <CardDescription className="flex items-center gap-1.5">
              <Flag country={university.country} />
              {/* City and state tell apart US colleges with the same name
                  (there are several "Bethel University"s). */}
              {university.city && university.state
                ? `${university.city}, ${university.state}`
                : university.country}
              <span className="ml-auto">
                <ChanceBadge
                  chance={match.chance}
                  source={match.chanceSource}
                  probability={prediction?.probability}
                />
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rank && (
              <div className="space-y-1 rounded-xl bg-muted/60 p-3 text-sm">
                {match.chanceSource === "model" && prediction && (
                  <p className="font-medium">
                    ~{Math.round(prediction.probability * 100)}% chance{" "}
                    <span className="font-normal text-muted-foreground">(estimate, not a promise)</span>
                  </p>
                )}
                <p className="text-muted-foreground">{rank.reason}</p>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data</span>
              <SourceBadge university={university} />
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Tuition</span>
              <span className="font-medium" title={tuition.note ?? undefined}>
                {tuition.text}
              </span>
            </div>
            {ranking && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">
                  Ranking ({ranking.label})
                </span>
                <span className="font-medium">{formatRank(ranking.rank)}</span>
              </div>
            )}
            <StrengthsConcerns explanation={explanation} limit={2} />
            {/* Leaves room for the controls pinned to the bottom corners. */}
            {(compare || tracking) && <div className="h-6" />}
          </CardContent>
        </Card>
      </Link>

      {/* Like the save button, these are siblings of the Link, not inside it. */}
      {tracking && (
        <div className="absolute bottom-3 left-4 z-10">
          <ApplicationStatusControl
            universityId={university.id}
            application={tracking.application}
          />
        </div>
      )}
      {compare && (
        <label
          className={cn(
            "absolute right-4 bottom-3 z-10 flex items-center gap-1.5 text-xs text-muted-foreground",
            compare.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
        >
          <input
            type="checkbox"
            checked={compare.selected}
            disabled={compare.disabled}
            onChange={compare.onToggle}
            className="size-3.5 accent-primary"
          />
          Compare
        </label>
      )}
    </motion.div>
  );
}
