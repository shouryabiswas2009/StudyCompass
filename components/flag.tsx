import { countryCode } from "@/lib/countries";
import { cn } from "@/lib/utils";

// Renders a small SVG flag via the `flag-icons` CSS package (imported once
// in app/layout.tsx). Unicode flag emoji don't render reliably on Windows,
// so we use real icons instead of relying on emoji font support.
export function Flag({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  const code = countryCode(country);
  if (!code) return null;

  return (
    <span
      className={cn("fi", `fi-${code}`, "rounded-[2px]", className)}
      aria-hidden
    />
  );
}
