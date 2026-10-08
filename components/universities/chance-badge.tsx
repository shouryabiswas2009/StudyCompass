import { DotLabel } from "@/components/dot-label";
import type { AdmissionChance } from "@/lib/matching";

const STYLES: Record<AdmissionChance, string> = {
  Reach: "text-rose-600 dark:text-rose-400",
  Match: "text-sky-700 dark:text-sky-400",
  Safety: "text-emerald-700 dark:text-emerald-400",
  "Not enough data": "text-muted-foreground",
};

// Shown wherever a school's admission chance appears. The tooltip says how
// the label was produced, since neither method is a real prediction.
export function ChanceBadge({
  chance,
  source = "rule",
  probability,
}: {
  chance: AdmissionChance;
  source?: "rule" | "model";
  probability?: number;
}) {
  const fromModel = source === "model" && probability !== undefined;
  return (
    <DotLabel
      className={STYLES[chance]}
      title={
        chance === "Not enough data"
          ? "This school doesn't publish admission figures we can compare you with, so there's no Reach / Match / Safety label"
          : fromModel
            ? "Estimate from a model trained on simulated (synthetic) applicants — a demo, not a real prediction"
            : "Rough rule of thumb from your GPA/SAT vs. typical admits and the acceptance rate"
      }
    >
      {chance}
      {fromModel && ` · ~${Math.round(probability * 100)}%`}
    </DotLabel>
  );
}
