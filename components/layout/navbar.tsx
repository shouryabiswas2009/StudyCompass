import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { MobileNavMenu } from "@/components/layout/mobile-nav-menu";

const navLinks = [
  { href: "/recommendations", label: "Recommendations" },
  { href: "/universities", label: "Browse" },
  { href: "/compare", label: "Compare" },
  { href: "/saved", label: "Saved" },
  { href: "/applications", label: "Applications" },
  { href: "/offers", label: "Offers" },
];

// Server component: reads the signed-in user (or null) and renders the
// right side of the navbar accordingly.
export function Navbar({ userEmail }: { userEmail: string | null }) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="page-container flex h-16 items-center justify-between">
        <Link href="/" aria-label={`${BRAND_NAME} home`} className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Logo size={26} markClassName="text-primary" />
        </Link>

        {userEmail && (
          // Six links only fit on wide screens; below `lg` they're in the menu.
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {userEmail ? (
            <>
              <Button variant="ghost" asChild className="hidden lg:inline-flex">
                <Link href="/profile" title={userEmail}>
                  Profile
                </Link>
              </Button>
              <MobileNavMenu />
              <LogoutButton />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">
                  Get started
                  <ArrowRight aria-hidden className="hidden sm:block" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
