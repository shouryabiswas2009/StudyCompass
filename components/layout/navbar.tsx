import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { MemberMenu } from "@/components/layout/member-menu";

const navLinks = [
  { href: "/recommendations", label: "Recommendations" },
  { href: "/universities", label: "Browse" },
  { href: "/compare", label: "Compare" },
  { href: "/saved", label: "Saved" },
  { href: "/applications", label: "Applications" },
  { href: "/offers", label: "Offers" },
];

// Rendered the same for everyone (so public pages can be cached): both the
// member links and the visitor's "Log in" are in the HTML, and CSS shows one
// of them based on <html data-auth>, which a tiny script sets from the login
// cookie before the page paints (lib/auth-cookie.ts). Members-only pages
// still check the session on the server.
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="page-container flex h-16 items-center justify-between">
        <Link href="/" aria-label={`${BRAND_NAME} home`} className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Logo size={26} markClassName="text-primary" />
        </Link>

        {/* Six links only fit on wide screens; below `lg` they're in the menu. */}
        <nav className="member-only hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} data-members-only className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="member-only flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden lg:inline-flex">
              <Link href="/profile" data-members-only>Profile</Link>
            </Button>
            <MemberMenu />
            <LogoutButton />
          </div>
          {/* Visitors: just "Log in". Signing up starts from the landing page
              (Get started, Try it, the closing banner) or the prompts on
              browse and university pages. */}
          <div className="guest-only">
            <Button variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
