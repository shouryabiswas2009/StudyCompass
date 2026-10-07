// The sign-up rules, in one place. The sign-up form checks them in the
// browser (for a quick message) and the sign-up server action checks them
// again (the browser check can be skipped, so the server one is the real
// one). Both call these functions, so they can't disagree.
//
// Passwords themselves are never returned, stored or logged by this code;
// Supabase handles them (hashing, storage) exactly as before.

export const MIN_PASSWORD_LENGTH = 6; // Supabase Auth's default minimum

export type SignupFieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function passwordErrors(password: string, confirmPassword: string): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  if (password.length === 0) errors.password = "Enter a password.";
  else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (confirmPassword.length === 0) errors.confirmPassword = "Type your password again to confirm it.";
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
  return errors;
}

export function emailError(email: string): string | undefined {
  if (email.trim().length === 0) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
  return undefined;
}

export type SignupValidation =
  | { ok: true; email: string; password: string }
  | { ok: false; errors: SignupFieldErrors };

export function validateSignup(email: string, password: string, confirmPassword: string): SignupValidation {
  const errors: SignupFieldErrors = { ...passwordErrors(password, confirmPassword) };
  const badEmail = emailError(email);
  if (badEmail) errors.email = badEmail;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, email: email.trim(), password };
}
