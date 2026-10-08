import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// The closing call to action: a quiet light band across the page, heading
// on the left and one button on the right (no icon circle, no card).
export function CtaSection() {
  return (
    <section aria-labelledby="cta-heading" className="border-t bg-secondary/60">
      <div className="page-container reveal flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:py-16">
        <div className="flex-1 space-y-2">
          <h2 id="cta-heading" className="text-section font-bold text-balance">
            Ready to find your fit?
          </h2>
          <p className="max-w-xl text-muted-foreground">A free profile takes a few minutes. Your matches update as you change it.</p>
        </div>
        <Button size="lg" asChild>
          <Link href="/signup">
            Create free account
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
