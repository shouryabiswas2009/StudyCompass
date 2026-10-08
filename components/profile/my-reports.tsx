import { REPORT_FIELDS, type ReportField } from "@/lib/figure-report";

export type MyReport = {
  id: string;
  field: ReportField;
  suggested_value: string | null;
  status: "open" | "fixed" | "rejected";
  created_at: string;
  universities: { name: string } | null;
};

const STATUS: Record<MyReport["status"], string> = {
  open: "Waiting to be checked",
  fixed: "Checked and corrected",
  rejected: "Checked: the figure matches its source",
};

// The figures this student reported as wrong, and what happened to them.
// Only they can read these (row level security, migration_018).
export function MyReports({ reports }: { reports: MyReport[] }) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Figures you reported</h3>
      <ul className="divide-y border-y text-sm">
        {reports.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <span>
              <span className="font-medium">{r.universities?.name ?? "A university"}</span>: {REPORT_FIELDS[r.field]}
              {r.suggested_value && <span className="text-muted-foreground"> → {r.suggested_value}</span>}
            </span>
            <span className="text-xs text-muted-foreground">
              {STATUS[r.status]} · {r.created_at.slice(0, 10)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
