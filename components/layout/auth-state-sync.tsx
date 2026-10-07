"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hasAuthCookie } from "@/lib/auth-cookie";

// Logging in or out moves to another page without a full reload, so the
// <head> script (AUTH_STATE_SCRIPT) doesn't run again. This re-checks the
// login cookie after every navigation and updates <html data-auth>, which
// decides whether the visitor or the member navbar shows.
export function AuthStateSync() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.dataset.auth = hasAuthCookie(document.cookie) ? "in" : "out";
  }, [pathname]);
  return null;
}
