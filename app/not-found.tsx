import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/layout/status-message";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusMessage
      eyebrow="404"
      title="We couldn't find that page"
      actions={
        <>
          <Button asChild>
            <Link href="/">
              Go to the home page
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/universities">Browse universities</Link>
          </Button>
        </>
      }
    >
      The link may be old, or the address may have a typo.
    </StatusMessage>
  );
}
