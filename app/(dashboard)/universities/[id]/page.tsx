import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, Percent, DollarSign, Pencil } from "lucide-react";
import { DeleteUniversityButton } from "@/components/universities/delete-university-button";
import { SourceBadge } from "@/components/universities/source-badge";
import { createClient } from "@/lib/supabase/server";
import { formatRank, scoreUniversity } from "@/lib/matching";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/universities/save-button";
import { MatchScoreBadge } from "@/components/universities/match-score-badge";
import { ChanceBadge } from "@/components/universities/chance-badge";
import { FitBreakdown } from "@/components/universities/fit-breakdown";
import { AdmissionEstimate } from "@/components/universities/admission-estimate";
import { StrengthsConcerns } from "@/components/universities/strengths-concerns";
import { Flag } from "@/components/flag";
import { usd } from "@/lib/format";
import { livingCostDisplay, tuitionDisplay } from "@/lib/money";
import { COOP_LABELS, RESEARCH_LABELS, focusSummary, focusesOf } from "@/lib/focus";
import { compareUrl } from "@/lib/compare";
import type { Profile, University } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { canonicalCountry } from "@/lib/countries";
import { getCountryInfo } from "@/lib/data/country-info";
import { CountryGuidance } from "@/components/universities/country-guidance";
import { WhatIfPanel } from "@/components/universities/what-if-panel";

// One read per request, shared by the page title and the page (React cache).
// Logged-out visitors can open this page: RLS lets anyone read shared
// schools, and a school a student added stays visible only to them.
const getUniversity = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("*").eq("id", id).maybeSingle<University>();
  return data;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const university = await getUniversity((await params).id);
  if (!university) return { title: "University not found" };
  const place = [university.city, university.country].filter(Boolean).join(", ");
  return {
    title: university.name,
    description: `${university.name}${place ? ` (${place})` : ""}: tuition, admission figures and where each number comes from.`,
  };
}

export default async function UniversityDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const user = await getCurrentUser();

  const university = await getUniversity(id);

  if (!university) notFound();

  const [{ data: savedRow }, { data: profile }, countryInfo] = await Promise.all([
    user
      ? supabase
          .from("saved_universities")
          .select("id")
          .eq("user_id", user.id)
          .eq("university_id", university.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle<Profile>()
      : Promise.resolve({ data: null }),
    getCountryInfo(),
  ]);
  const country = canonicalCountry(university.country);

  // Personal fit needs a profile. Without one (not signed in, or no profile
  // yet) the page still works and shows a plain "Overall" ranking.
  const entry = profile ? scoreUniversity(profile, university) : null;
  const ranking = entry?.ranking ?? { rank: university.qs_ranking, label: "Overall" };

  const official = university.source === "College Scorecard";
  const curated = university.source === "curated";
  const tuition = tuitionDisplay(university);
  const living = livingCostDisplay(university);
  // Masters / PhD students: say clearly that these are undergraduate figures.
  const graduateStudent = profile !== null && profile.preferred_degree_level !== "Undergraduate";

  // For curated rows: where each figure was checked, so it can be checked again.
  const sourceLinks = [
    { label: "Tuition", url: university.tuition_source_url },
    { label: "Living costs", url: university.living_cost_source_url },
    { label: "Admission rate", url: university.acceptance_source_url },
    { label: "Programs", url: university.programs_source_url },
    { label: "Co-op / internships", url: university.internship_support_url },
  ].filter((l): l is { label: string; url: string } => Boolean(l.url));

  const admissionFigures = [
    {
      label: "Typical admitted GPA",
      value: university.avg_admitted_gpa != null ? `${university.avg_admitted_gpa} / 100` : "Not available",
    },
    {
      // Scorecard publishes Reading and Math separately; adding them only
      // approximates the total-score range (see the note below).
      label: official ? "SAT 25th–75th (Reading + Math)" : "SAT middle 50%",
      value:
        university.sat_25 != null && university.sat_75 != null
          ? `${university.sat_25}–${university.sat_75}`
          : "Not used / not available",
    },
    {
      label: "Minimum IELTS",
      value: university.min_ielts != null ? university.min_ielts.toFixed(1) : "Not available",
    },
    {
      label: "Living cost",
      value: living.text,
    },
  ];

  // Extra official figures only Scorecard schools have. Each is shown only
  // when Scorecard actually reports it.
  const officialFigures = [
    { label: "Type", value: university.ownership ? university.ownership[0].toUpperCase() + university.ownership.slice(1) : null },
    { label: "Undergraduates", value: university.student_size != null ? university.student_size.toLocaleString("en-US") : null },
    { label: "In-state tuition", value: university.tuition_in_state != null ? `${usd(university.tuition_in_state)}/yr` : null },
    { label: "Average net price", value: university.avg_net_price != null ? `${usd(university.avg_net_price)}/yr` : null },
    { label: "Graduate within 6 years", value: university.completion_rate != null ? `${university.completion_rate}%` : null },
    { label: "Return for a 2nd year", value: university.retention_rate != null ? `${university.retention_rate}%` : null },
    {
      label: "Median earnings, 10 yrs after entry",
      value: university.median_earnings_10yr != null ? `${usd(university.median_earnings_10yr)}/yr` : null,
    },
  ].filter((f) => f.value !== null);

  // The figures the research / work-experience focuses use. Shown for every
  // school, with "Not available" rather than a guess when we don't have one.
  const focusFigures = [
    {
      label: "Research activity (Carnegie)",
      value: university.research_intensity ? RESEARCH_LABELS[university.research_intensity] : "Not available",
    },
    {
      label: "Co-op / internship program",
      value: COOP_LABELS[university.coop_program ?? "unknown"],
    },
  ];

  const stats = [
    {
      icon: DollarSign,
      label: tuition.approximate ? "Tuition (approximate)" : "Tuition",
      value: tuition.text,
    },
    {
      icon: TrendingUp,
      label: `QS Ranking — ${ranking.label}`,
      value: formatRank(ranking.rank),
    },
    {
      icon: Percent,
      label: "Acceptance rate",
      value: university.acceptance_rate !== null ? `${university.acceptance_rate}%` : "Not available",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href={user ? "/recommendations" : "/"}>
          <ArrowLeft className="size-4" />
          {user ? "Back to recommendations" : "Back to home"}
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {university.name}
          </h1>
          <p className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <Flag country={university.country} />
            {[university.city, university.state, university.country].filter(Boolean).join(", ")}
            <span className="ml-1">
              <SourceBadge university={university} showLink />
            </span>
          </p>
        </div>
        {user ? (
          <SaveButton universityId={university.id} initiallySaved={!!savedRow} />
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/login?next=/universities/${university.id}`}>Log in to save</Link>
          </Button>
        )}
      </div>

      {/* Visitors without an account see the facts; their own fit needs a profile. */}
      {!user && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border bg-tint p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-tint-foreground">
            <strong>How well does it fit you?</strong> Create a free profile to see your match score,
            admission estimate and the What if? sliders for this university.
          </p>
          <Button asChild size="sm">
            <Link href="/signup">Create free account</Link>
          </Button>
        </div>
      )}

      {/* Only schools a student added can be changed; RLS also enforces this. */}
      {university.created_by && (
        <div className="mt-4 flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/universities/${university.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <DeleteUniversityButton id={university.id} name={university.name} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border p-4 text-center"
          >
            <stat.icon className="mx-auto mb-2 size-5 text-primary" />
            <p className="text-lg font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      {(tuition.note || living.note || graduateStudent) && (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {tuition.note && <p>Tuition: {tuition.note}</p>}
          {living.note && <p>Living cost: {living.note}</p>}
          {graduateStudent && (
            <p>
              Tuition, admission rate and test scores here are undergraduate
              figures unless stated; {profile!.preferred_degree_level} fees and
              admission differ, so check the program&apos;s own page.
            </p>
          )}
        </div>
      )}

      {entry && (
        <div className="mt-8 rounded-2xl border p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-medium">Your fit</h2>
            <MatchScoreBadge score={entry.match.score} />
            <ChanceBadge
              chance={entry.match.chance}
              source={entry.match.chanceSource}
              probability={entry.prediction?.probability}
            />
          </div>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">
            Scored with your focuses: <strong>{focusSummary(focusesOf(profile!))}</strong>.{" "}
            <Link href="/profile" className="underline">
              Change it
            </Link>
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <FitBreakdown factors={entry.match.factors} />
            <StrengthsConcerns explanation={entry.explanation} />
          </div>
          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 text-sm font-medium">Admission estimate</h3>
            <AdmissionEstimate
              prediction={entry.prediction}
              degreeLevel={profile!.preferred_degree_level}
            />
          </div>
          <div className="mt-6 border-t pt-5">
            <WhatIfPanel profile={profile!} university={university} />
          </div>
        </div>
      )}

      <div className="mt-8 space-y-2">
        <h2 className="font-medium">About</h2>
        <p className="text-muted-foreground">{university.description}</p>
      </div>

      <div className="mt-8 space-y-2">
        <h2 className="font-medium">Admission figures</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {admissionFigures.map((figure) => (
            <div key={figure.label} className="rounded-xl border p-3">
              <dt className="text-xs text-muted-foreground">{figure.label}</dt>
              <dd className="font-medium">{figure.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          {official ? (
            <>
              From the US Department of Education College Scorecard (data year{" "}
              {university.data_year}). Scorecard doesn&apos;t publish admitted
              GPAs or English-test minimums, so those show as not available. The
              SAT range adds the Reading and Math percentiles, which only
              approximates the total-score range.
            </>
          ) : curated ? (
            <>
              Checked by hand on the university&apos;s own website
              {university.data_year ? ` (${university.data_year})` : ""}; each
              figure&apos;s page is linked below. Most universities outside the US
              don&apos;t publish an admission rate or test-score range, so those
              show as not available.
            </>
          ) : university.source === "user-entered" ? (
            <>Entered by you{university.source_url ? " — see the source link at the top" : ""}.</>
          ) : (
            <>
              Illustrative approximations for this demo, not official admissions
              statistics. Check the university&apos;s own website before deciding.
            </>
          )}
        </p>
      </div>

      {sourceLinks.length > 0 && (
        <div className="mt-8 space-y-2">
          <h2 className="font-medium">Sources</h2>
          <ul className="space-y-1 text-sm">
            {sourceLinks.map(({ label, url }) => (
              <li key={label}>
                <span className="text-muted-foreground">{label}: </span>
                <a href={url} target="_blank" rel="noopener noreferrer" className="break-all underline">
                  {new URL(url).hostname}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {officialFigures.length > 0 && (
        <div className="mt-8 space-y-2">
          <h2 className="font-medium">More official figures</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {officialFigures.map((figure) => (
              <div key={figure.label} className="rounded-xl border p-3">
                <dt className="text-xs text-muted-foreground">{figure.label}</dt>
                <dd className="font-medium">{figure.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            College Scorecard, data year {university.data_year}. Earnings follow
            students who started several years earlier, so they describe an
            older group than the other figures.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-2">
        <h2 className="font-medium">Research and work experience</h2>
        <dl className="grid grid-cols-2 gap-3">
          {focusFigures.map((figure) => (
            <div key={figure.label} className="rounded-xl border p-3">
              <dt className="text-xs text-muted-foreground">{figure.label}</dt>
              <dd className="font-medium">{figure.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          {university.source === "user-entered"
            ? "Entered by you."
            : official
              ? "Research activity is the Carnegie Classification as reported by College Scorecard."
              : "Not available for illustrative schools."}{" "}
          Co-op / internship programs are only filled in from the school&apos;s
          own page{university.internship_support_url ? (
            <>
              {" "}(
              <a href={university.internship_support_url} target="_blank" rel="noopener noreferrer" className="underline">
                source
              </a>
              )
            </>
          ) : null}
          ; &ldquo;not available&rdquo; means we haven&apos;t found a clear statement,
          not that there isn&apos;t one. Graduate earnings (above) are shown for
          information only and don&apos;t affect the work-experience focus.
        </p>
      </div>

      <div className="mt-8">
        <CountryGuidance
          country={country}
          info={countryInfo.byCountry.get(country) ?? null}
          pending={countryInfo.pending}
        />
      </div>

      <div className="mt-8 space-y-2">
        <h2 className="font-medium">Popular programs</h2>
        <div className="flex flex-wrap gap-2">
          {university.popular_programs.map((program) => (
            <Badge
              key={program}
              variant={program === ranking.label ? "default" : "secondary"}
            >
              {program}
            </Badge>
          ))}
        </div>
      </div>

      {(university.degree_levels ?? []).length > 0 && (
        <div className="mt-8 space-y-2">
          <h2 className="font-medium">Degree levels offered</h2>
          <div className="flex flex-wrap gap-2">
            {university.degree_levels.map((level) => (
              <Badge
                key={level}
                variant={level === profile?.preferred_degree_level ? "default" : "secondary"}
              >
                {level}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex gap-3">
        <Button asChild>
          <Link href={compareUrl([university.id])}>Compare</Link>
        </Button>
      </div>
    </div>
  );
}
