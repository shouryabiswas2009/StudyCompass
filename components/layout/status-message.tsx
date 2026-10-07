import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";

// The layout for "not found" and "something went wrong" pages. No hooks, so
// both server pages (not-found) and client error boundaries can use it.
export function StatusMessage({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section className="page-container flex flex-col items-center py-24 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-tint text-tint-foreground">
        <LogoMark size={32} />
      </span>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-section font-bold text-balance">{title}</h1>
      <div className="mt-3 max-w-md text-muted-foreground">{children}</div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
    </section>
  );
}
