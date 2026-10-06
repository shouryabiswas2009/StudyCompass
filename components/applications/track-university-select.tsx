"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addApplication } from "@/lib/actions/applications";

// "Start tracking one of your saved universities" dropdown.
export function TrackUniversitySelect({
  options,
  savedCount,
}: {
  // Saved universities that aren't tracked yet.
  options: { id: string; name: string }[];
  savedCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {savedCount === 0
          ? "Save universities from Recommendations or Browse, then track them here."
          : "Every saved university is already being tracked. Save more from Recommendations or Browse to add them here."}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Select
        value=""
        disabled={isPending}
        onValueChange={(id) =>
          startTransition(async () => {
            const result = await addApplication(id);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        <SelectTrigger className="w-full sm:w-80" aria-label="Track a saved university">
          <SelectValue placeholder={isPending ? "Adding…" : "Track a saved university"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
