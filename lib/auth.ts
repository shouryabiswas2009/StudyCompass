import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null };

// The signed-in student, or null. Used by the root layout (navbar) and every
// dashboard page.
//
// Why getClaims() and not getUser(): getUser() asks Supabase's Auth server
// on every call (~250 ms round trip, measured in docs/PERFORMANCE.md).
// getClaims() checks the session token's signature locally against the
// project's public signing key (ES256), which Supabase's own Next.js guide
// recommends for protecting pages. The key is fetched once and cached.
//
// Why cache(): React's cache() runs this once per request, however many
// server components ask, so the layout and the page share one check.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = data.claims.email;
  return { id: data.claims.sub, email: typeof email === "string" ? email : null };
});
