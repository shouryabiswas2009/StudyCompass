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
import { FOCUS_LABELS, RESEARCH_LABELS, focusOf } from "@/lib/focus";
import { compareUrl } from "@/lib/compare";
import type { Profile, University } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export default async function UniversityDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const user = await getCurrentUser();

  const { data: university } = await supabase
    .from("universities")
    .select("*")
    .eq("id", id)
    .maybeSingle<University>();

  if (!university) notFound();

  const [{ data: savedRow }, { data: profile }] = await Promise.all([
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
  ]);

  // Personal fit needs a profile. Without one (not signed in, or no profile
  // yet) the page still works and shows a plain "Overall" ranking.
  const entry = profile ? scoreUniversity(profile, university) : null;
  const ranking = entry?.ranking ?? { rank: university.qs_ranking, label: "Overall" };

  const official = university.source === "College Scorecard";

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
      value:
        university.living_cost_per_year != null
          ? `about ${usd(university.living_cost_per_year)}/yr`
          : "Not available",
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
      value: university.has_coop == null ? "Not available" : university.has_coop ? "Yes" : "No",
    },
  ];

  const stats = [
    {
      icon: DollarSign,
      label: "Tuition",
      value: `${usd(university.tuition)}/yr`,
    },
    {
      icon: TrendingUp,
      label: `QS Ranking — ${ranking.label}`,
      value: formatRank(ranking.rank),
    },
    {
      icon: Percent,
      label: "Acceptance rate",
      value: `${university.acceptance_rate}%`,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/recommendations">
          <ArrowLeft className="size-4" />
          Back to recommendations
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
        <SaveButton universityId={university.id} initiallySaved={!!savedRow} />
      </div>

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
            Scored with your focus: <strong>{FOCUS_LABELS[focusOf(profile!)]}</strong>.{" "}
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
        <h2 className="font-medium">Research and careers</h2>
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
          No official source lists co-op / internship programs for every
          school, so the app never fills that in; you can set it on schools you
          add yourself.
        </p>
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
