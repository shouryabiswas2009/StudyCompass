import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Building2 } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { AccentTitle } from "@/components/landing/section-heading";
import type { LandingStats } from "@/lib/landing";

// Photo by Vadim Sherbakov on Unsplash (Unsplash License; see docs/CREDITS.md).
// Allowed by exact path in next.config.ts.
const HERO_PHOTO = "https://images.unsplash.com/20/cambridge.JPG";

// The top of the landing page: headline and two buttons on the left; on the
// right a photo that runs to the edge of the screen with a slanted left
// edge, and one small stat card on top of it. The number is counted from the
// database (lib/landing.ts), not typed in.
export function Hero({ stats }: { stats: LandingStats }) {
  return (
    <section className="relative overflow-hidden">
      <div className="page-container grid items-center gap-10 py-12 lg:min-h-[34rem] lg:grid-cols-2 lg:py-20">
        <div className="relative z-10 space-y-6">
          <p className="eyebrow">Welcome to {BRAND_NAME}</p>
          <h1 className="text-display font-extrabold text-balance">
            <AccentTitle title="Find the university that actually fits you." accent="fits you." />
          </h1>
          <p className="max-w-md text-muted-foreground text-pretty">
            {BRAND_NAME}{" "}matches you to universities by budget, grades, major
            and what matters most to you, using official US figures and fees
            checked on each university&apos;s own website.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get started
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Link
              href="#try-it"
              className="group inline-flex items-center gap-3 rounded-full text-sm font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-11 items-center justify-center rounded-full border bg-card shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowDown className="size-4" aria-hidden />
              </span>
              Try it, no account needed
            </Link>
          </div>
        </div>

        {/* Photo: full-bleed to the right edge on large screens, a rounded
            card under the text on small ones. */}
        <div className="relative h-72 overflow-hidden rounded-3xl sm:h-96 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[48%] lg:rounded-none lg:rounded-bl-[3rem] lg:[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]">
          <Image
            src={HERO_PHOTO}
            alt="A historic college building behind a striped green lawn"
            fill
            priority
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      {stats.universities > 0 && (
        <div className="page-container pointer-events-none relative -mt-24 flex justify-end pb-6 lg:absolute lg:inset-x-0 lg:bottom-10 lg:mt-0 lg:pb-0">
          <div className="pointer-events-auto mr-3 w-44 rounded-2xl bg-band p-5 text-band-foreground shadow-xl sm:mr-6">
            <span className="mb-3 flex size-10 items-center justify-center rounded-full border border-band-muted/40">
              <Building2 className="size-5" aria-hidden />
            </span>
            <p className="font-heading text-4xl font-extrabold tabular-nums">
              {stats.universities.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-sm text-band-muted">universities in {stats.countries} countries</p>
            <span className="mt-4 block h-0.5 w-10 rounded bg-band-muted/60" aria-hidden />
          </div>
        </div>
      )}
    </section>
  );
}
