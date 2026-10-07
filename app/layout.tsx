import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TITLE } from "@/lib/brand";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthStateSync } from "@/components/layout/auth-state-sync";
import { AUTH_STATE_SCRIPT } from "@/lib/auth-cookie";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Only used for small code snippets (e.g. on /credits): don't make every
  // page download it up front.
  preload: false,
});

// Headings (h1–h3) use Plus Jakarta Sans via --font-heading in globals.css.
// Both fonts are self-hosted by next/font (no request to Google at runtime).
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Lets link previews (and any relative metadata URL) use the real domain.
  metadataBase: new URL(siteUrl()),
  // Pages set their own title ("Compare your offers"); this adds the name.
  title: { default: BRAND_TITLE, template: `%s · ${BRAND_NAME}` },
  description: BRAND_DESCRIPTION,
  openGraph: { siteName: BRAND_NAME, type: "website" },
};

// No cookies are read here, so public pages (landing, privacy, credits,
// university pages) can be built once and served from Vercel's cache. The
// navbar picks its member or visitor version in the browser (see Navbar).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets <html data-auth="in|out"> from the login cookie before the
            page paints, so the right navbar shows with no flash. */}
        <script dangerouslySetInnerHTML={{ __html: AUTH_STATE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <AuthStateSync />
          <main className="flex-1">{children}</main>
          <Footer />
          {/* Vercel Web Analytics: cookie-less page-view counts (see /privacy).
              Only sends data once it's switched on in the Vercel dashboard. */}
          <Analytics />
          {/* Vercel Speed Insights: how fast pages load for real visitors
              (free tier; switch it on in the Vercel dashboard). */}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
