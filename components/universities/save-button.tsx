"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleSavedUniversity } from "@/lib/actions/saved";

export function SaveButton({
  universityId,
  initiallySaved,
  className,
}: {
  universityId: string;
  initiallySaved: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  // Counts saves made on this page, so the "pop" plays when the student
  // saves, not when a page loads with schools already saved.
  const [pops, setPops] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const wasSaved = saved;
    setSaved(!wasSaved); // optimistic update
    if (!wasSaved) setPops((n) => n + 1);
    startTransition(async () => {
      try {
        await toggleSavedUniversity(universityId, wasSaved);
      } catch {
        setSaved(wasSaved); // revert if the request failed
      }
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label={saved ? "Remove from saved" : "Save university"}
      onClick={handleClick}
      disabled={isPending}
      className={cn("rounded-md", className)}
    >
      {saved ? (
        <BookmarkCheck key={pops} className={cn("size-4 text-primary", pops > 0 && "animate-pop")} />
      ) : (
        <Bookmark className="size-4" />
      )}
    </Button>
  );
}
