import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type MatchTier = "strong" | "moderate" | "weak";

// Shared with UniversityCard so the card's accent border and the badge
// agree on what counts as a strong/moderate/weak match.
export function matchTier(score: number): MatchTier {
  return score >= 80 ? "strong" : score >= 50 ? "moderate" : "weak";
}

// Green for a strong fit, amber for a decent fit, gray for a weak one.
export function MatchScoreBadge({ score }: { score: number }) {
  const tier = matchTier(score);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold",
        tier === "strong" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        tier === "moderate" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        tier === "weak" && "border-muted-foreground/20 text-muted-foreground"
      )}
    >
      {score}% match
    </Badge>
  );
}
