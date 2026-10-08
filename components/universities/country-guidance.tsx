import { AlertTriangle, ExternalLink } from "lucide-react";
import { checkAge, guidanceItems, oldestCheck, type CountryInfo } from "@/lib/country-info";

// Visa and post-study work guidance for one destination country, on the
// details page and (one per country) on the offers page. Each figure links
// to the government page it came from and says how old the check is,
// because these rules change often.
export function CountryGuidance({
  country,
  info,
  pending,
  compact = false,
}: {
  country: string;
  info: CountryInfo | null;
  pending: boolean;
  compact?: boolean;
}) {
  const items = guidanceItems(info);
  const oldest = oldestCheck(info);

  return (
    <section className="space-y-3">
      <div>
        {/* Compact cards sit under the offers page's own heading, so one level lower. */}
        {compact ? (
          <h3 className="font-medium">{country}</h3>
        ) : (
          <h2 className="font-medium">Visas and work in {country}</h2>
        )}
        <p className="text-xs text-muted-foreground">
          Guidance only: rules change, so check the official source before you decide.
          {oldest && <> Oldest figure {oldest.label}.</>}
        </p>
      </div>

      {pending ? (
        <p className="border-l-2 py-1 pl-3 text-sm text-muted-foreground">
          Visa guidance isn&apos;t set up yet (the database step for it hasn&apos;t been run).
        </p>
      ) : (
        <dl className={compact ? "grid border-t" : "grid gap-x-6 border-t sm:grid-cols-3"}>
          {items.map((item) => {
            const age = item.text && item.checkedOn ? checkAge(item.checkedOn) : null;
            return (
              <div key={item.key} className="border-b py-3">
                <dt className="text-xs text-muted-foreground">{item.title}</dt>
                <dd className="mt-1 space-y-1">
                  {item.text ? (
                    <>
                      {item.headline && <p className="font-medium">{item.headline}</p>}
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline"
                          >
                            Official source <ExternalLink className="size-3" aria-hidden />
                          </a>
                        )}
                        {age && (
                          <span className={age.stale ? "inline-flex items-center gap-1 text-amber-600 dark:text-amber-400" : ""}>
                            {age.stale && <AlertTriangle className="size-3" aria-hidden />}
                            {age.label}
                            {age.stale && " (may be out of date)"}
                          </span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="font-medium text-muted-foreground">Not available</p>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {!pending && info?.notes && <p className="text-xs text-muted-foreground">Note: {info.notes}</p>}
      {!pending && !info && (
        <p className="text-xs text-muted-foreground">
          No official figures have been checked for {country} yet.
        </p>
      )}
    </section>
  );
}
