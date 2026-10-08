import { checkAge } from "@/lib/country-info";
import type { MatchEntry } from "@/lib/matching";

// The one-line visa note on a card (only when the student shows or factors
// in the visa). Plain text, no link: the card itself is a link; the
// government sources are on the university's page and in compare.
export function VisaNote({ visa }: { visa: NonNullable<MatchEntry["visa"]> }) {
  const checked = visa.info?.post_study_checked_on ?? visa.info?.work_checked_on ?? visa.info?.funds_checked_on ?? null;
  const age = checked ? checkAge(checked) : null;
  return (
    <p className="text-xs text-muted-foreground">
      {visa.line}
      {visa.info && (
        <>
          {" "}· guidance only{age ? `, ${age.label}` : ""}
          {age?.stale ? " (may be out of date)" : ""}
        </>
      )}
    </p>
  );
}
