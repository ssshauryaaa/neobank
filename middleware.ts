import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const cookieToken = req.cookies.get("token")?.value;

  const headerToken = req.headers.get("authorization")?.replace("Bearer ", "");

  const token = cookieToken || headerToken; // 🔥 key change

  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    let payload: any = null;

    try {
      const payloadPart = token.split(".")[1];
      payload = JSON.parse(Buffer.from(payloadPart, "base64").toString());
      // console.log("MIDDLEWARE PAYLOAD:", payload);
    } catch (err) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // 🔴 vulnerable check
    if (payload?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // console.log("MIDDLEWARE TOKEN:", token);

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*"],
};
