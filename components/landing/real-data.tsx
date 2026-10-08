import { CircleSlash, Gauge, Globe2, Landmark, Plane } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";
import type { LandingStats } from "@/lib/landing";

// Where the numbers come from, in plain words. Keep this in line with the
// README's "Where the data comes from" section.
export function RealData({ stats }: { stats: LandingStats }) {
  const sources = [
    {
      icon: Landmark,
      title: "College Scorecard for US schools",
      text: `Official US Department of Education figures for ${stats.officialUs.toLocaleString("en-US")} schools: tuition, admission rates, SAT ranges, graduation rates and earnings. Each school links to its Scorecard page.`,
    },
    {
      icon: Globe2,
      title: "University websites everywhere else",
      text: `${stats.checkedInternational} universities outside the US, with fees copied by hand from each university's own pages. Every figure links to its page and says which year it's for.`,
    },
    {
      icon: Plane,
      title: "Government sites for visas",
      text: "Post-study work, proof of funds and work-hour limits come only from government immigration websites, with the date each one was checked.",
    },
    {
      icon: Gauge,
      title: "A strength estimate, not a ranking",
      text: "Each university's “Strength (Unicelerate index)” is our own estimate from open data (graduation, earnings and research figures), with a confidence label. Where we know too little, it's estimated from similar schools and shown as a range.",
    },
    {
      icon: CircleSlash,
      title: "Honest gaps",
      text: "If a figure can't be verified, it says “Not available” instead of guessing, and the match score leaves it out rather than counting it as zero.",
    },
  ];
  return (
    <section id="real-data" aria-labelledby="real-data-heading" className="page-container section-y">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <SectionHeading
          id="real-data-heading"
          eyebrow="Real data"
          title="Every number says where it came from"
          accent="where it came from"
          description="No invented statistics and no scraped or copied ranking sites. The strength index is our own labelled estimate, never presented as an official ranking."
        />
        {/* Rows with a bold lead-in and hairlines between them, not cards. */}
        <ul className="reveal divide-y border-y">
          {sources.map((source) => (
            <li key={source.title} className="grid gap-2 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
              <h3 className="flex items-start gap-2 font-semibold">
                <source.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {source.title}
              </h3>
              <p className="text-muted-foreground">{source.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
