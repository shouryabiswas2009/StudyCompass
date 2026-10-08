import type { LandingStats } from "@/lib/landing";
import { CountUp } from "@/components/motion/count-up";

// The numbers, as an edge-to-edge band: large figures with thin dividers,
// no box or icon around each one. Every number is counted from the database
// on the server (lib/landing.ts), never typed in.
export function StatsBand({ stats }: { stats: LandingStats }) {
  if (stats.universities === 0) return null;
  const items = [
    { value: stats.universities, label: "universities" },
    { value: stats.countries, label: "countries" },
    { value: stats.verifiedTuition, label: "with tuition from an official or university source" },
    { value: stats.checkedInternational, label: "outside the US, checked by hand" },
  ];
  return (
    <section aria-label="The data in numbers" className="bg-band text-band-foreground">
      <div className="page-container py-12 sm:py-16">
        <ul className="reveal grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-band-muted/25">
          {items.map((item) => (
            <li key={item.label} className="lg:px-8 lg:first:pl-0">
              <p className="font-heading text-5xl font-extrabold tabular-nums">
                <CountUp value={item.value} />
              </p>
              <p className="mt-2 max-w-[15rem] text-sm text-band-muted">{item.label}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-band-muted">Counted from the live database.</p>
      </div>
    </section>
  );
}
