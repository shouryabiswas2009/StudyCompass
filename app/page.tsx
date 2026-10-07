import { Hero } from "@/components/landing/hero";
import { WhatsNew } from "@/components/landing/whats-new";
import { ScreenPreviews } from "@/components/landing/screen-previews";
import { StatsBand } from "@/components/landing/stats-band";
import { RealData } from "@/components/landing/real-data";
import { CtaSection } from "@/components/landing/cta-section";
import { getSharedUniversities } from "@/lib/data/universities";
import { getCountryInfo } from "@/lib/data/country-info";
import { exampleMatches, exampleWhatIf, landingStats } from "@/lib/landing";

// The landing page. Its numbers and examples come from the same cached data
// the rest of the app uses (no extra database load per visit).
export default async function Home() {
  const [universities, countryInfo] = await Promise.all([
    getSharedUniversities().catch(() => []),
    getCountryInfo(),
  ]);
  const stats = landingStats(universities);
  // Match preview: a US school with official figures, so the example score
  // covers grades and admission rate too (most non-US schools publish none).
  const [topMatch] = exampleMatches(universities.filter((u) => u.source === "College Scorecard"), 1);
  // Visa preview: the top example's country if it has figures, else Canada.
  const visa =
    (topMatch && countryInfo.byCountry.get(topMatch.university.country)) ?? countryInfo.byCountry.get("Canada") ?? null;

  return (
    <>
      <Hero stats={stats} />
      <WhatsNew />
      <ScreenPreviews match={topMatch ?? null} whatIf={exampleWhatIf(universities)} visa={visa} />
      <StatsBand stats={stats} />
      <RealData stats={stats} />
      <CtaSection />
    </>
  );
}
