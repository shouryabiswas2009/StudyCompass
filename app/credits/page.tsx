import type { Metadata } from "next";
import { creditsHtml } from "@/lib/credits";

export const metadata: Metadata = {
  title: "Credits and licences",
  description: "The fonts, icons, images, graphics and data the site uses, and their licences.",
};

export default function CreditsPage() {
  const { title, html } = creditsHtml();
  return (
    <article className="page-container max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Credits</p>
      <h1 className="mt-3 text-section font-bold">{title}</h1>
      {/* Rendered from docs/CREDITS.md (lib/credits.ts). */}
      <div className="markdown mt-6" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
