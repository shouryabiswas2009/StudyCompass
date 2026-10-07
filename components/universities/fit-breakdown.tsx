import type { FactorScore } from "@/lib/matching";

// One bar per scoring factor, so the student can see exactly where the
// match score comes from. Unknown factors are shown, but marked as not
// counted, so a missing score never looks like a zero.
export function FitBreakdown({ factors }: { factors: FactorScore[] }) {
  return (
    <div className="space-y-3">
      {factors.map((factor) => (
        <div key={factor.key} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{factor.label}</span>
            <span className="font-medium">
              {factor.points === null
                ? (factor.note ?? "Unknown (not counted)")
                : `${factor.points} / ${factor.max}`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            {factor.points !== null && (
              <div
                className="animate-grow-x h-full rounded-full bg-primary"
                style={{ width: `${(factor.points / factor.max) * 100}%` }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
