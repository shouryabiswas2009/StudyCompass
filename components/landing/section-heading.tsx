import { cn } from "@/lib/utils";

// The heading pattern used by every landing section: a small uppercase
// "eyebrow" label, a big heading where one word is in the accent colour,
// and an optional line of description.
export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = "left",
  id,
  className,
}: {
  eyebrow: string;
  title: string;
  // A word (or words) from `title` to show in the accent colour.
  accent?: string;
  description?: string;
  align?: "left" | "center";
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto text-center", className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="text-section font-bold text-balance">
        <AccentTitle title={title} accent={accent} />
      </h2>
      {description && <p className="text-muted-foreground text-pretty">{description}</p>}
    </div>
  );
}

// Splits the title around the accent word, so the heading reads as one
// sentence to screen readers but shows the word in green.
export function AccentTitle({ title, accent }: { title: string; accent?: string }) {
  const at = accent ? title.lastIndexOf(accent) : -1;
  if (!accent || at === -1) return <>{title}</>;
  return (
    <>
      {title.slice(0, at)}
      <span className="text-primary">{accent}</span>
      {title.slice(at + accent.length)}
    </>
  );
}
