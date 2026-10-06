import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createUniversity } from "@/lib/actions/universities";
import { UniversityForm } from "@/components/universities/university-form";
import { Button } from "@/components/ui/button";

export default function NewUniversityPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/universities">
          <ArrowLeft className="size-4" />
          Back to browse
        </Link>
      </Button>

      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold">Add a university</h1>
        <p className="text-muted-foreground">
          Missing a school you&apos;re considering? Add it here. Only you can
          see it, and it&apos;s scored against your profile like any other.
        </p>
      </div>

      <UniversityForm action={createUniversity} submitLabel="Add university" />
    </div>
  );
}
