// Which pages need a logged-in student. Used by the proxy
// (lib/supabase/middleware.ts) on every request.

const PROTECTED_PREFIXES = [
  "/profile",
  "/recommendations",
  "/universities",
  "/compare",
  "/saved",
  "/applications",
  "/offers",
];

// A single university's page is public: anyone can read shared schools
// (RLS), and a school a student added stays visible only to that student.
// Browse (/universities), "add" (/universities/new) and "edit" stay
// members-only.
export function isPublicUniversityPage(path: string): boolean {
  return /^\/universities\/(?!new$)[^/]+\/?$/.test(path);
}

export function isProtectedPath(path: string): boolean {
  if (isPublicUniversityPage(path)) return false;
  return PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
