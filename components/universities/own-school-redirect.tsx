"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/layout/status-message";
import { hasAuthCookie } from "@/lib/auth-cookie";

// Shown on /universities/<id> when no shared school has that id. If the
// visitor is signed in it may be a school they added (those are private, at
// /universities/mine/<id>), so we send them there; otherwise it's simply
// not found. Same page for everyone, so it can be cached.
export function OwnSchoolRedirect({ id }: { id: string }) {
  const router = useRouter();
  // null on the server (no cookies there), true/false in the browser.
  const signedIn = useSyncExternalStore(
    () => () => {},
    () => hasAuthCookie(document.cookie),
    () => null
  );
  useEffect(() => {
    if (signedIn) router.replace(`/universities/mine/${id}`);
  }, [signedIn, id, router]);
  if (signedIn !== false) return <div className="skeleton mx-auto my-24 h-40 max-w-md rounded-2xl" aria-label="Loading" />;
  return (
    <StatusMessage
      eyebrow="Not found"
      title="That university doesn't exist"
      actions={
        <Button asChild>
          <Link href="/universities">Browse universities</Link>
        </Button>
      }
    >
      It may have been removed, or it&apos;s a school another student added (only they can see those).
    </StatusMessage>
  );
}
