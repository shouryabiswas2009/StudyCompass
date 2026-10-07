import { LogoMark } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";

// Set by the /auth/callback and /auth/confirm routes when a link fails.
const LINK_ERRORS: Record<string, string> = {
  "confirmation-failed":
    "That confirmation link is invalid or has expired. Try signing up again to get a new one.",
  "auth-callback-failed":
    "We couldn't sign you in from that link. Please log in below.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const linkError = error ? LINK_ERRORS[error] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <LogoMark size={40} className="text-primary" />
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Log in to see your university recommendations.
        </p>
      </div>
      {linkError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {linkError}
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
