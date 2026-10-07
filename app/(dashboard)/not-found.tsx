import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/layout/status-message";

// Shown when a page inside the app calls notFound(), e.g. a university id
// that doesn't exist.
export default function DashboardNotFound() {
  return (
    <StatusMessage
      eyebrow="Not found"
      title="That university or page doesn't exist"
      actions={
        <>
          <Button asChild>
            <Link href="/universities">Browse universities</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/recommendations">Your recommendations</Link>
          </Button>
        </>
      }
    >
      It may have been removed, or it&apos;s a school another student added (only they can see those).
    </StatusMessage>
  );
}
