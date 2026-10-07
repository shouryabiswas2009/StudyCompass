import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BRAND_NAME } from "@/lib/brand";

const CREDITS_URL = "https://github.com/shouryabiswas2009/StudyCompass/blob/main/docs/CREDITS.md";

// Columns of links. Only real pages: no contact details or social links
// that don't exist.
const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/recommendations", label: "Recommendations" },
      { href: "/universities", label: "Browse universities" },
      { href: "/compare", label: "Compare" },
      { href: "/offers", label: "Offers" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
      { href: "/profile", label: "Your profile" },
      { href: "/applications", label: "Applications" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/#real-data", label: "Where the data comes from" },
      { href: "/privacy", label: "Privacy" },
      { href: CREDITS_URL, label: "Credits and licences", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="page-container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Link href="/" aria-label={`${BRAND_NAME} home`} className="inline-flex rounded-md">
            <Logo size={28} />
          </Link>
          <p className="max-w-xs text-sm text-footer-muted">
            Find the university that fits you, not just the ranking. Free to use, built on sourced data.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-3 text-sm font-semibold">{column.title}</h2>
            <ul className="space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-footer-muted hover:text-footer-foreground hover:underline">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-footer-muted hover:text-footer-foreground hover:underline">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-footer-muted/20">
        <p className="page-container py-5 text-xs text-footer-muted">
          &copy; {new Date().getFullYear()} {BRAND_NAME}. Figures are guidance only: always check the official source before you decide.
        </p>
      </div>
    </footer>
  );
}
