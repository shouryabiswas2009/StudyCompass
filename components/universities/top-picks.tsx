import Link from "next/link";
import { Flag } from "@/components/flag";
import { MatchScoreBadge } from "@/components/universities/match-score-badge";
import type { MatchEntry } from "@/lib/matching";
import { universityPath } from "@/lib/university-path";

// "Top picks by country": the best few matches in each preferred country,
// side by side, above the full ranked list. One country with far more
// schools in the data (the US) can't crowd the others out of view here.
export function TopPicks({ groups }: { groups: { country: string; picks: MatchEntry[] }[] }) {
  if (groups.length === 0) return null;
  return (
    <section className="mb-10 space-y-3">
      <h2 className="font-medium">Top picks by country</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ country, picks }) => (
          <div key={country} className="rounded-2xl border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Flag country={country} />
              {country}
            </h3>
            {picks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No schools here for your degree level in this list yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {picks.map(({ university, match }, i) => (
                  <li key={university.id} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-muted-foreground">{i + 1}.</span>
                    <Link href={universityPath(university)} className="mr-auto hover:underline">
                      {university.name}
                    </Link>
                    <MatchScoreBadge score={match.score} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
