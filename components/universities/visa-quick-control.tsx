import { setVisaMode } from "@/lib/actions/profile";
import { VISA_MODES, VISA_MODE_LABELS, type VisaMode } from "@/lib/visa";
import { cn } from "@/lib/utils";

// A quick switch for "Visa and work rights" on the recommendations page.
// A plain form (works without JavaScript); the weight and "do you plan to
// stay?" are on the profile.
export function VisaQuickControl({ mode }: { mode: VisaMode }) {
  return (
    <form action={setVisaMode} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Visa and work rights:</span>
      {VISA_MODES.map((m) => (
        <button
          key={m}
          type="submit"
          name="visa_mode"
          value={m}
          aria-pressed={mode === m}
          className={cn(
            "rounded-md border px-2.5 py-1 hover:bg-muted",
            mode === m && "border-primary bg-primary/5 font-medium"
          )}
        >
          {VISA_MODE_LABELS[m]}
        </button>
      ))}
    </form>
  );
}
