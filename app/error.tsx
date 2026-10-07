"use client"; // Error boundaries must be client components.

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/layout/status-message";

// Shown when a page crashes. The technical message isn't shown (it can
// contain internal details); the reference code lets us find it in the logs.
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusMessage
      eyebrow="Something went wrong"
      title="This page didn't load"
      actions={
        <>
          <Button onClick={() => unstable_retry()}>
            <RotateCcw aria-hidden />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Go to the home page</Link>
          </Button>
        </>
      }
    >
      Please try again in a moment.
      {error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
    </StatusMessage>
  );
}
