import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  planning: "Planning",
  applied: "Applied",
  admitted: "Admitted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  accepted: "Accepted",
};

const STYLES: Record<ApplicationStatus, string> = {
  planning: "border-muted-foreground/20 text-muted-foreground",
  applied: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  admitted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  waitlisted: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rejected: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  accepted: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
