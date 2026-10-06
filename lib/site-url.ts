// The public address of the site, e.g. "https://www.unicelerate.com", used in
// links that leave the app (the sign-up confirmation email) and as the base
// for link previews. In order:
//   1. NEXT_PUBLIC_SITE_URL, if you set it (do this for a custom domain)
//   2. on Vercel, the production domain Vercel fills in automatically
//      (VERCEL_PROJECT_PRODUCTION_URL, without "https://")
//   3. http://localhost:3000 for local development
// A trailing slash is removed so callers can append "/auth/callback".
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
