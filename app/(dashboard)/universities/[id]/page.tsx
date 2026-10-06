import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, Percent, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDisplayRanking } from "@/lib/matching";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/universities/save-button";
import { Flag } from "@/components/flag";
import type { Profile, University } from "@/lib/types";

export default async function UniversityDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Falls back to a plain "Overall" ranking when we don't know the
  // viewer's intended major (not signed in, or no profile yet).
  const ranking = profile
    ? getDisplayRanking(university, profile)
    : { rank: university.qs_ranking, label: "Overall" };

  const stats = [
    {
      icon: DollarSign,
      label: "Tuition",
      value: `$${university.tuition.toLocaleString()}/yr`,
    },
    {
      icon: TrendingUp,
      label: `QS Ranking — ${ranking.label}`,
      value: `#${ranking.rank}`,
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
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Flag country={university.country} />
            {university.country}
          </p>
        </div>
        <SaveButton universityId={university.id} initiallySaved={!!savedRow} />
      </div>

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

      <div className="mt-8 space-y-2">
        <h2 className="font-medium">About</h2>
        <p className="text-muted-foreground">{university.description}</p>
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

      <div className="mt-10 flex gap-3">
        <Button asChild>
          <Link href={`/compare?a=${university.id}`}>Compare</Link>
        </Button>
      </div>
    </div>
  );
}
