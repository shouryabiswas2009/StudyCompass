// Whether this browser has a Supabase login cookie ("sb-<project>-auth-token",
// split into ".0", ".1"… when large). Used only to choose which navbar to
// show (visitor or member), so every public page can be cached and shared
// by everyone. It's not a security check: members-only pages still verify
// the session on the server (proxy.ts and each page).
export const AUTH_COOKIE_RE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=[^;]+/;

export function hasAuthCookie(cookieHeader: string): boolean {
  return AUTH_COOKIE_RE.test(cookieHeader);
}

// Runs in <head> before the page paints, so the right navbar shows straight
// away with no flash. Kept tiny and dependency-free on purpose.
export const AUTH_STATE_SCRIPT = `try{document.documentElement.dataset.auth=${AUTH_COOKIE_RE}.test(document.cookie)?"in":"out"}catch(e){}`;
