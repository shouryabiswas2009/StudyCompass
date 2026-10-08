import { cn } from "@/lib/utils";

// A label as plain text with a small coloured dot, instead of a pill.
// `className` sets the colour (the dot uses the text colour).
export function DotLabel({ className, title, children }: { className?: string; title?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)} title={title}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
