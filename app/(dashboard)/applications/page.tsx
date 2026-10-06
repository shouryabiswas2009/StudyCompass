import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ApplicationCard } from "@/components/applications/application-card";
import { TrackUniversitySelect } from "@/components/applications/track-university-select";
import { Button } from "@/components/ui/button";
import type { Application, University } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

type ApplicationRow = Application & {
  universities: Pick<University, "id" | "name" | "country">;
};

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ data: applications }, { data: saved }] = await Promise.all([
    supabase
      .from("applications")
      .select("*, universities(id, name, country)")
      .eq("user_id", user.id)
      .returns<ApplicationRow[]>(),
    supabase
      .from("saved_universities")
      .select("university_id, universities(id, name)")
      .eq("user_id", user.id)
      .returns<{ university_id: string; universities: { id: string; name: string } }[]>(),
  ]);

  // Soonest deadline first; ones without a deadline go last, by name.
  const sorted = (applications ?? []).sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return a.universities.name.localeCompare(b.universities.name);
  });

  const trackedIds = new Set(sorted.map((a) => a.university_id));
  const untracked = (saved ?? [])
    .map((row) => row.universities)
    .filter((u) => u && !trackedIds.has(u.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const admittedCount = sorted.filter((a) => a.status === "admitted" || a.status === "accepted").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-muted-foreground">
            Track where you&apos;re applying, deadlines, and the details of
            any offers you receive.
          </p>
        </div>
        {admittedCount > 0 && (
          <Button asChild>
            <Link href="/offers">Compare {admittedCount} offer{admittedCount === 1 ? "" : "s"}</Link>
          </Button>
        )}
      </div>

      <div className="mb-8">
        <TrackUniversitySelect options={untracked} savedCount={(saved ?? []).length} />
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="size-5 text-muted-foreground" />
          </div>
          <p className="max-w-sm text-muted-foreground">
            You&apos;re not tracking any applications yet. Pick a saved
            university above, or use &ldquo;Track application&rdquo; on the{" "}
            <Link href="/saved" className="underline">
              Saved
            </Link>{" "}
            page.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              university={application.universities}
            />
          ))}
        </div>
      )}
    </div>
  );
}
