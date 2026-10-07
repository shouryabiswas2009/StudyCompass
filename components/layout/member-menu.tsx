"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { hasAuthCookie } from "@/lib/auth-cookie";

// The members' mobile menu uses a dropdown library (~40 KB). Visitors never
// see it, so it's only downloaded when a login cookie is present.
const MobileNavMenu = dynamic(() => import("@/components/layout/mobile-nav-menu").then((m) => m.MobileNavMenu), {
  ssr: false,
});

export function MemberMenu() {
  // false on the server (no cookies there), the real answer in the browser.
  const signedIn = useSyncExternalStore(
    () => () => {},
    () => hasAuthCookie(document.cookie),
    () => false
  );
  return signedIn ? <MobileNavMenu /> : null;
}
