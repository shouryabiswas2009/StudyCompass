import { BadgeCheck, Building2, Globe2, Search } from "lucide-react";
import type { LandingStats } from "@/lib/landing";
import { CountUp } from "@/components/motion/count-up";

// The dark green band of numbers. Every number is counted from the database
// on the server (lib/landing.ts), never typed in.
export function StatsBand({ stats }: { stats: LandingStats }) {
  if (stats.universities === 0) return null;
  const items = [
    { icon: Building2, value: stats.universities, label: "universities" },
    { icon: Globe2, value: stats.countries, label: "countries" },
    { icon: BadgeCheck, value: stats.verifiedTuition, label: "with tuition from an official or university source" },
    { icon: Search, value: stats.checkedInternational, label: "outside the US, checked by hand" },
  ];
  return (
    <section aria-label="The data in numbers" className="page-container">
      <ul className="reveal grid gap-6 rounded-3xl bg-band px-6 py-8 text-band-foreground sm:grid-cols-2 sm:px-10 lg:grid-cols-4 lg:divide-x lg:divide-band-muted/25">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-4 lg:px-6 lg:first:pl-0">
            <item.icon className="size-9 shrink-0 text-band-muted" strokeWidth={1.5} aria-hidden />
            <div>
              <p className="font-heading text-3xl font-extrabold">
                <CountUp value={item.value} />
              </p>
              <p className="text-sm text-band-muted">{item.label}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-muted-foreground">Counted from the live database.</p>
    </section>
  );
}
