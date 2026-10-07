import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateUniversity } from "@/lib/actions/universities";
import { UniversityForm } from "@/components/universities/university-form";
import { Button } from "@/components/ui/button";
import type { University } from "@/lib/types";

export const metadata: Metadata = { title: "Edit university" };

export default async function EditUniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: university } = await supabase
    .from("universities")
    .select("*")
    .eq("id", id)
    .maybeSingle<University>();

  // Shared schools have no created_by and can't be edited. (RLS would refuse
  // the update anyway; this just avoids showing a form that can't work.)
  if (!university || !university.created_by) notFound();

  // Bind the id so the form's action only receives (state, formData).
  const action = updateUniversity.bind(null, university.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href={`/universities/mine/${university.id}`}>
          <ArrowLeft className="size-4" />
          Back to {university.name}
        </Link>
      </Button>

      <h1 className="mb-8 text-2xl font-semibold">Edit {university.name}</h1>

      <UniversityForm action={action} existing={university} submitLabel="Save changes" />
    </div>
  );
}
