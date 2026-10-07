// The public address of the site, e.g. "https://www.unicelerate.com", used in
// links that leave the app (the sign-up confirmation email) and as the base
// for link previews. Only server code reads it, so it doesn't need the
// NEXT_PUBLIC_ prefix (which would also send it to the browser). In order:
//   1. SITE_URL, if you set it (do this for a custom domain); the older
//      name NEXT_PUBLIC_SITE_URL is still accepted
//   2. on Vercel, the production domain Vercel fills in automatically
//      (VERCEL_PROJECT_PRODUCTION_URL, without "https://")
//   3. http://localhost:3000 for local development
// A trailing slash is removed so callers can append "/auth/callback".
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.SITE_URL?.trim() || env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
