import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { MARK_FILL_PATHS, MARK_STROKE_PATHS, MARK_VIEWBOX } from "@/components/brand/mark";

// The logo mark alone. It's drawn in currentColor, so it takes the text
// colour around it: deep green in light mode, light green in dark mode
// (use className="text-primary"), white on a dark band.
export function LogoMark({
  size = 24,
  className,
  title,
}: {
  size?: number;
  className?: string;
  // Give a title when the mark stands alone (no wordmark next to it).
  title?: string;
}) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {MARK_FILL_PATHS.map((d) => (
        <path key={d} d={d} fill="currentColor" />
      ))}
      {MARK_STROKE_PATHS.map((p) => (
        <path
          key={p.d}
          d={p.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={p.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// The mark with the name next to it, in the heading font. `size` is the
// mark's height in pixels; the name scales with it.
export function Logo({
  size = 24,
  variant = "full",
  className,
  markClassName,
}: {
  size?: number;
  variant?: "full" | "mark";
  className?: string;
  markClassName?: string;
}) {
  if (variant === "mark") return <LogoMark size={size} className={markClassName ?? className} title={BRAND_NAME} />;
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-heading font-bold tracking-tight", className)}
      style={{ fontSize: Math.round(size * 0.75) }}
    >
      <LogoMark size={size} className={markClassName} />
      {BRAND_NAME}
    </span>
  );
}
