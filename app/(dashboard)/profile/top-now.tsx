import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getSharedUniversities } from "@/lib/data/universities";
import { getCountryInfo } from "@/lib/data/country-info";
import { offersDegreeLevel, scoreUniversity } from "@/lib/matching";
import { compareBest, withNeutralUnknowns } from "@/lib/ranking";
import { universityPath } from "@/lib/university-path";
import type { Profile } from "@/lib/types";

// "Your top 3 right now": what the saved profile does, with the same
// ranking as the recommendations page ("Best you can get into", featured
// shared schools). Computed on the server and cached per saved profile
// (the profile itself is part of the cache key), so it only reruns after a
// save, never per keystroke.
const topThree = unstable_cache(
  async (profile: Profile) => {
    const [universities, countryInfo] = await Promise.all([getSharedUniversities(), getCountryInfo()]);
    const entries = universities
      .filter((u) => u.is_featured !== false && offersDegreeLevel(profile, u))
      .map((u) => scoreUniversity(profile, u, { countryInfo: countryInfo.byCountry }));
    return withNeutralUnknowns(entries)
      .sort(compareBest)
      .slice(0, 3)
      .map((e) => ({ id: e.university.id, path: universityPath(e.university), name: e.university.name, country: e.university.country, reason: e.rank.reason }));
  },
  ["profile-top-now", "v1"],
  { revalidate: 3600, tags: ["universities"] }
);

export async function TopNow({ profile }: { profile: Profile }) {
  const top = await topThree(profile);
  return (
    <aside aria-labelledby="top-now-heading" className="border-t pt-4">
      <h2 id="top-now-heading" className="text-sm font-semibold">Your top 3 right now</h2>
      <p className="mt-1 text-xs text-muted-foreground">Updates after you save.</p>
      {top.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No featured school fits these settings yet.</p>
      ) : (
        <ol className="mt-3 divide-y border-y">
          {top.map((t, i) => (
            <li key={t.id} className="py-3 text-sm">
              <span className="mr-2 font-heading font-semibold tabular-nums text-primary">{String(i + 1).padStart(2, "0")}</span>
              <Link href={t.path} className="font-medium underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                {t.name}
              </Link>
              <span className="block pl-7 text-xs text-muted-foreground">
                {t.country} · {t.reason}
              </span>
            </li>
          ))}
        </ol>
      )}
      <Link href="/recommendations" className="mt-3 inline-block text-sm underline underline-offset-4">
        See all recommendations
      </Link>
    </aside>
  );
}
