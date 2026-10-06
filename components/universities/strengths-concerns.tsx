import { CircleAlert, CircleCheck } from "lucide-react";
import type { MatchExplanation } from "@/lib/matching";

// Strengths and concerns side by side, so weak spots are as visible as the
// good news. Cards pass a `limit` to stay short; the detail page shows all.
export function StrengthsConcerns({
  explanation,
  limit,
}: {
  explanation: MatchExplanation;
  limit?: number;
}) {
  const strengths = limit ? explanation.strengths.slice(0, limit) : explanation.strengths;
  const concerns = limit ? explanation.concerns.slice(0, limit) : explanation.concerns;
  const hidden =
    explanation.strengths.length - strengths.length +
    (explanation.concerns.length - concerns.length);

  return (
    <div className="space-y-1.5 text-sm">
      {strengths.map((text) => (
        <p key={text} className="flex gap-2 text-muted-foreground">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          <span>{text}</span>
        </p>
      ))}
      {concerns.map((text) => (
        <p key={text} className="flex gap-2 text-muted-foreground">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <span>{text}</span>
        </p>
      ))}
      {hidden > 0 && (
        <p className="pl-6 text-xs text-muted-foreground">
          +{hidden} more on the details page
        </p>
      )}
    </div>
  );
}
