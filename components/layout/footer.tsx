import Link from "next/link";
import { Compass } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Compass className="size-4 text-primary" />
          <span>StudyCompass</span>
        </div>
        <p>Find the university that fits you, not just the ranking.</p>
        <Link href="/" className="hover:text-foreground">
          &copy; {new Date().getFullYear()} StudyCompass
        </Link>
      </div>
    </footer>
  );
}
