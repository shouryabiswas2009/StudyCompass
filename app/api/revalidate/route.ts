import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// Refreshes the cached university data after you run an import in the
// Supabase SQL Editor, so the site shows it without waiting a day:
//
//   curl -X POST https://www.unicelerate.com/api/revalidate -H "Authorization: Bearer <REVALIDATE_SECRET>"
//
// It marks the data stale; visitors keep getting the cached pages while the
// fresh ones are built in the background (stale-while-revalidate).
// REVALIDATE_SECRET is a server-only environment variable (never NEXT_PUBLIC_).
const TAGS = ["universities", "country-info"];

function authorized(header: string | null): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  // Constant-time comparison, so the secret can't be guessed letter by letter.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  for (const tag of TAGS) revalidateTag(tag, "max");
  return NextResponse.json({ revalidated: TAGS });
}
