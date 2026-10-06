"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteUniversity } from "@/lib/actions/universities";

export function DeleteUniversityButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    // Deleting can't be undone (and removes it from your saved list), so ask first.
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;

    startTransition(async () => {
      const result = await deleteUniversity(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-1">
      <Button variant="outline" onClick={handleClick} disabled={isPending}>
        <Trash2 className="size-4" />
        {isPending ? "Deleting…" : "Delete"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
