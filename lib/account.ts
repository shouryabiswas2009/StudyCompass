// The confirmation step for deleting an account: the student has to type
// this word, so it can't happen by one accidental click. Checked in the
// browser (to enable the button) and again in the server action.
export const DELETE_CONFIRMATION_WORD = "DELETE";

export function isDeleteConfirmed(typed: unknown): boolean {
  return typeof typed === "string" && typed.trim().toUpperCase() === DELETE_CONFIRMATION_WORD;
}
