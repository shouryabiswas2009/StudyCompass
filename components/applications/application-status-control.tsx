"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addApplication, updateApplicationStatus } from "@/lib/actions/applications";
import { STATUS_LABELS } from "@/components/applications/status-badge";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

// The small control on saved-university cards: a status dropdown if the
// school is already in the tracker, or a "Track" button if it isn't.
export function ApplicationStatusControl({
  universityId,
  application,
}: {
  universityId: string;
  application: { id: string; status: ApplicationStatus } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(application?.status);
  const [error, setError] = useState<string | null>(null);

  if (!application) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await addApplication(universityId);
            if (result.error) setError(result.error);
            else router.refresh(); // show the new status dropdown
          })
        }
        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        title={error ?? undefined}
      >
        {isPending ? "Adding…" : error ? "Couldn't add — retry" : "+ Track application"}
      </button>
    );
  }

  return (
    <select
      aria-label="Application status"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as ApplicationStatus;
        const previous = status;
        setStatus(next); // optimistic: show the change right away
        startTransition(async () => {
          const result = await updateApplicationStatus(application.id, next);
          if (result.error) setStatus(previous); // undo if the save failed
        });
      }}
      className="rounded-md border bg-background px-1.5 py-0.5 text-xs"
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
