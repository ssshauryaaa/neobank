import { NextRequest, NextResponse } from "next/server";

// 🔴 VULNERABLE: Open Redirect — accepts any value for `next` and redirects
// Exploit: /api/redirect?next=https://evil.com
// Attacker use-case: phishing links that appear to come from neobank.com
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 🔴 FIX: validate `next` against an allowlist of internal paths only
  const next = searchParams.get("next") || "/dashboard";

  // Log the redirect for monitoring (always fires, patched or not)
  const isExternal = /^https?:\/\//i.test(next) || next.startsWith("//");

  if (isExternal) {
    console.warn(`[OPEN REDIRECT] Redirecting to external URL: ${next}`);
  }

  // 🔴 VULNERABLE: No validation — redirects anywhere
  return NextResponse.redirect(next.startsWith("/") ? `http://localhost:3000${next}` : next, {
    status: 302,
  });
}
