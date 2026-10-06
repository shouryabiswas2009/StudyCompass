import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdmissionChance } from "@/lib/matching";

const STYLES: Record<AdmissionChance, string> = {
  Reach: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  Match: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Safety: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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
    <Badge
      variant="outline"
      className={cn("font-medium", STYLES[chance])}
      title={
        fromModel
          ? "Estimate from a model trained on simulated (synthetic) applicants — a demo, not a real prediction"
          : "Rough rule of thumb from your GPA/SAT vs. typical admits and the acceptance rate"
      }
    >
      {chance}
      {fromModel && ` · ~${Math.round(probability * 100)}%`}
    </Badge>
  );
}
