import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/layout/status-message";

export const metadata: Metadata = { title: "Account deleted", robots: { index: false } };

export default function AccountDeletedPage() {
  return (
    <StatusMessage
      eyebrow="Done"
      title="Your account and data have been deleted"
      actions={
        <Button asChild>
          <Link href="/">Go to the home page</Link>
        </Button>
      }
    >
      Your login, profile, saved schools, applications and any universities you added are gone.
      You can sign up again any time.
    </StatusMessage>
  );
}
