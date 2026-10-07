import Link from "next/link";
import { ArrowRight, Briefcase, ClipboardList, Gauge, Scale, Target, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/landing/section-heading";

type Feature = { icon: LucideIcon; title: string; description: string };

// What the app can do, in plain words. Keep these accurate to what exists.
// They're plain cards on purpose: the features live on members-only pages,
// and the landing page keeps just three ways in (Get started, Try it, and
// the closing banner).
const FEATURES: Feature[] = [
  {
    icon: Gauge,
    title: "Admission estimate",
    description: "For US schools with official figures, a demo model estimates your chance and shows what moved it.",
  },
  {
    icon: Target,
    title: "What matters most",
    description: "Tick reputation, work experience, research or affordability, and the scoring leans that way.",
  },
  {
    icon: Briefcase,
    title: "Co-op and internships",
    description: "Co-op programs taken only from the university's own pages (a few schools so far).",
  },
  {
    icon: ClipboardList,
    title: "Application tracker",
    description: "Status, deadline, costs and scholarship for every application, in one place.",
  },
  {
    icon: Scale,
    title: "Compare your offers",
    description: "Rank offers by what matters to you, spot a clear winner or a close call, and track accept-by dates.",
  },
];

export function WhatsNew() {
  return (
    <section id="whats-new" aria-labelledby="whats-new-heading" className="page-container section-y scroll-mt-16">
      <div className="reveal flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          id="whats-new-heading"
          eyebrow="What's new"
          title="Tools that go past a ranking list"
          accent="past a ranking list"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:max-w-md">
          <p className="text-sm text-muted-foreground">
            Every page scores with the same rules, and every figure says where it came from.
          </p>
          <Button variant="outline" asChild className="shrink-0 self-start sm:self-auto">
            <Link href="/universities">
              Browse universities
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="reveal lift flex flex-col rounded-2xl border bg-card p-5 hover:shadow-md">
            <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <feature.icon className="size-5" aria-hidden />
            </span>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
