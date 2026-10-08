import { DotLabel } from "@/components/dot-label";
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
      <DotLabel
        className="text-emerald-700 dark:text-emerald-400"
        title={`Official figures from the US Department of Education College Scorecard (data year ${data_year}).${fetched}`}
      >
        College Scorecard{data_year ? ` · ${data_year} data` : ""}
      </DotLabel>
    );
  }

  // Checked by hand on the university's own website: says which site and
  // which year, and deliberately never says "official".
  if (source === "curated") {
    const site = source_url ? new URL(source_url).hostname.replace(/^www\./, "") : "university website";
    return (
      <DotLabel
        className="text-sky-700 dark:text-sky-400"
        title="Figures checked by hand on the university's own pages (linked on the details page). Converted amounts are approximate."
      >
        Source: {site}
        {data_year ? ` · ${data_year}` : ""}
      </DotLabel>
    );
  }

  if (source === "user-entered") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <DotLabel className="text-muted-foreground">Added by you</DotLabel>
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
    <DotLabel
      className="text-amber-700 dark:text-amber-400"
      title="Hand-written sample figures for this demo — not official statistics"
    >
      Illustrative data
    </DotLabel>
  );
}
