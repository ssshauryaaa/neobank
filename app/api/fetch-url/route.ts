import { NextRequest, NextResponse } from "next/server";

// 🔴 VULNERABLE: Server fetches any URL the client supplies — classic SSRF
// Exploit examples:
//   POST /api/fetch-url  { "url": "http://localhost:3000/api/debug" }
//   POST /api/fetch-url  { "url": "http://127.0.0.1:3306" }
//   POST /api/fetch-url  { "url": "file:///etc/passwd" }

const PRIVATE_IP_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,    // AWS/GCP metadata
  /^https?:\/\/\[::1\]/,       // IPv6 loopback
  /^file:\/\//i,
];

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const url = body?.url?.trim();
  if (!url) {
    return NextResponse.json({ success: false, message: "url is required" }, { status: 400 });
  }

  // 🔴 FIX THIS: check url against PRIVATE_IP_PATTERNS before fetching
  // When patched, this should run:
  //   const isSafe = !PRIVATE_IP_PATTERNS.some(p => p.test(url));
  //   if (!isSafe) return NextResponse.json({ success: false, message: "Internal URLs are not permitted" }, { status: 403 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "NeoBank/1.0 AccountLinker" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    const contentType = upstream.headers.get("content-type") || "";
    const responseText = await upstream.text();

    return NextResponse.json({
      success: true,
      status: upstream.status,
      contentType,
      // 🔴 Returns the FULL server response body — leaks internal data
      body: responseText.slice(0, 8000),
      fetchedUrl: url,
      debug: {
        headers: Object.fromEntries(upstream.headers.entries()),
        finalUrl: upstream.url,
      },
    });
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    return NextResponse.json({
      success: false,
      message: isTimeout ? "Request timed out (5s)" : `Fetch error: ${err?.message}`,
      fetchedUrl: url,
    }, { status: 502 });
  }
}
