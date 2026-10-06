import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { University } from "@/lib/types";

type SourceFields = Pick<University, "source" | "data_year" | "fetched_at" | "source_url">;

// Says where a school's figures come from, everywhere they're shown, so
// sample numbers are never mistaken for official ones.
export function SourceBadge({
  university,
  showLink = false,
}: {
  university: SourceFields;
  // Cards are themselves links, and a link can't contain another link, so
  // only the details page shows the clickable source URL.
  showLink?: boolean;
}) {
  const { source, data_year, fetched_at, source_url } = university;

  if (source === "College Scorecard") {
    const fetched = fetched_at ? ` Fetched ${fetched_at.slice(0, 10)}.` : "";
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
        title={`Official figures from the US Department of Education College Scorecard (data year ${data_year}).${fetched}`}
      >
        College Scorecard{data_year ? ` · ${data_year} data` : ""}
      </Badge>
    );
  }

  if (source === "user-entered") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Badge variant="secondary">Added by you</Badge>
        {source_url && showLink && (
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-xs underline"
          >
            source
          </a>
        )}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("border-amber-500/30 text-amber-700 dark:text-amber-400")}
      title="Hand-written sample figures for this demo — not official statistics"
    >
      Illustrative data
    </Badge>
  );
}
