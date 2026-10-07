import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/profile",
  "/recommendations",
  "/universities",
  "/compare",
  "/saved",
  "/applications",
  "/offers",
];
const AUTH_PATHS = ["/login", "/signup"];

// Called from proxy.ts (Next.js 16's renamed middleware) on every request.
// Refreshes the Supabase session cookie and redirects based on auth state.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getClaims().
  // A simple mistake here can cause hard-to-debug session refresh issues.
  //
  // getClaims() verifies the session token's signature locally (the project
  // uses asymmetric ES256 keys), so unlike getUser() it doesn't make a network
  // call to Supabase Auth on every request. It still refreshes an expired
  // session and writes the new cookies through setAll above.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((p) => path.startsWith(p));
  const isAuthPath = AUTH_PATHS.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    // Remember where they were going, so logging in takes them there
    // (the login action only accepts a path on this site, see safeRedirectPath).
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/recommendations";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
