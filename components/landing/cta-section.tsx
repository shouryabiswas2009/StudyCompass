import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

// The closing call to action: a dark green banner with a sand-coloured button.
export function CtaSection() {
  return (
    <section aria-labelledby="cta-heading" className="page-container pb-[var(--section-y)]">
      <div className="flex flex-col items-start gap-6 rounded-3xl bg-band px-6 py-10 text-band-foreground sm:flex-row sm:items-center sm:px-10">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-sand text-sand-foreground">
          <LogoMark size={28} />
        </span>
        <div className="flex-1 space-y-1">
          <h2 id="cta-heading" className="text-2xl font-bold sm:text-3xl">
            Ready to find your fit?
          </h2>
          <p className="text-band-muted">A free profile takes a few minutes. Your matches update as you change it.</p>
        </div>
        <Button size="lg" asChild className="bg-sand text-sand-foreground hover:bg-sand/90">
          <Link href="/signup">
            Create free account
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
