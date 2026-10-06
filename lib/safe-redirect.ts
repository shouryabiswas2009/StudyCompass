// Auth links carry a `next` param saying where to go after sign-in. Anyone
// can craft such a link, so only accept a plain path on our own site.
// Without this check, `next=@evil.com` would turn
// `https://our-site.com` + next into `https://our-site.com@evil.com`,
// which browsers treat as a link to evil.com (an "open redirect").
export function safeRedirectPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  // Must start with a single "/" — "//evil.com" is a link to another site.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
