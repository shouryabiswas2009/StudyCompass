import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversityDetails } from "@/components/universities/university-details";
import { PersonalFit, PersonalSave } from "@/components/universities/personal-island";
import { OwnSchoolRedirect } from "@/components/universities/own-school-redirect";
import { ReportFigure } from "@/components/universities/report-figure";
import { getPublicUniversity } from "@/lib/data/universities";
import { getCountryInfo } from "@/lib/data/country-info";

// A shared university's page, the same for everyone, so it's built on the
// first visit and then served from Vercel's cache (ISR), rebuilt in the
// background at most once a day. The personal parts (save, your fit) load
// in the browser for signed-in students (components/universities/personal-island.tsx).
export const revalidate = 86400;

// Pages are built when first visited rather than all at build time.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const university = await getPublicUniversity((await params).id);
  if (!university) return { title: "University not found", robots: { index: false } };
  const place = [university.city, university.country].filter(Boolean).join(", ");
  return {
    title: university.name,
    description: `${university.name}${place ? ` (${place})` : ""}: tuition, admission figures and where each number comes from.`,
  };
}

export default async function UniversityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [university, countryInfo] = await Promise.all([getPublicUniversity(id), getCountryInfo()]);
  // Not a shared school: it may be one a student added (private). Their own
  // schools live at /universities/mine/<id>; old links get sent there.
  if (!university) return <OwnSchoolRedirect id={id} />;

  return (
    <UniversityDetails
      university={university}
      countryInfo={countryInfo}
      backLink={
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/universities">
            <ArrowLeft className="size-4" />
            Browse universities
          </Link>
        </Button>
      }
      headerAction={<PersonalSave id={university.id} />}
      fit={<PersonalFit university={university} />}
      report={<ReportFigure universityId={university.id} />}
    />
  );
}
