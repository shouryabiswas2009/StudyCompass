"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/lib/actions/account";
import { DELETE_CONFIRMATION_WORD, isDeleteConfirmed } from "@/lib/account";

// "Delete my account and data", in two steps: first a button that explains
// what will happen, then a box where the student types DELETE. The server
// action checks the word again before doing anything.
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState(deleteAccount, undefined);

  return (
    <section aria-labelledby="delete-heading" className="mt-12 rounded-2xl border border-destructive/30 p-6">
      <h2 id="delete-heading" className="font-semibold">Delete my account and data</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently deletes your login, profile, saved schools, applications and offers, and any
        universities you added. This can&apos;t be undone.
      </p>

      {!open ? (
        <Button variant="destructive" className="mt-4" onClick={() => setOpen(true)}>
          <Trash2 aria-hidden />
          Delete my account…
        </Button>
      ) : (
        <form action={formAction} className="appear mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete">
              Type <strong>{DELETE_CONFIRMATION_WORD}</strong> to confirm
            </Label>
            <Input
              id="confirm-delete"
              name="confirm"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-describedby={state?.error ? "delete-error" : undefined}
            />
          </div>
          {state?.error && (
            <p id="delete-error" className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={!isDeleteConfirmed(typed) || pending}>
              {pending ? "Deleting…" : "Permanently delete everything"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
