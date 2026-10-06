"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import type { University } from "@/lib/types";

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
  isSaved = false,
  index = 0,
}: {
  university: University;
  match: MatchResult;
  explanation: MatchExplanation;
  ranking?: DisplayRanking;
  isSaved?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
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
              {university.country}
              {university.created_by && (
                <Badge variant="secondary" className="ml-1">
                  Added by you
                </Badge>
              )}
              <span className="ml-auto">
                <ChanceBadge chance={match.chance} />
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Tuition</span>
              <span className="font-medium">
                ${university.tuition.toLocaleString("en-US")}/yr
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
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
