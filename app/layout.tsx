import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TITLE } from "@/lib/brand";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Shared with the page through React's cache(), so one check per request.
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar userEmail={user?.email ?? null} />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
