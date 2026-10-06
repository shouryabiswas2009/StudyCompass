import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

// The confirmation email links here (see the email template step in the
// README) with a one-time `token_hash`. Verifying it signs the user in.
// Unlike the code exchange in /auth/callback, this doesn't depend on a
// cookie from the signup browser, so the link also works if the student
// opens the email on their phone.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // New accounts have no profile yet, so the profile form is the next step.
  const next = safeRedirectPath(searchParams.get("next"), "/profile");

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation-failed`);
}
