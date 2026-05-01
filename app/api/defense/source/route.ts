// Read-only source file server for the Blue Team Codebase Explorer
// Serves a whitelisted set of project files — no editing possible

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_FILES = new Set([
  // lib
  "lib/auth.ts",
  "lib/db.ts",
  "lib/logAttack.ts",
  "lib/defense.ts",
  "lib/logs.ts",
  // API routes
  "app/api/login/route.ts",
  "app/api/register/route.ts",
  "app/api/user/route.ts",
  "app/api/profile/route.ts",
  "app/api/search/route.ts",
  "app/api/transactions/route.ts",
  "app/api/transfer/route.ts",
  "app/api/redirect/route.ts",
  "app/api/fetch-url/route.ts",
  "app/api/secret/route.ts",
  "app/api/debug/route.ts",
  // pages
  "app/page.tsx",
  "app/login/page.tsx",
  "app/dashboard/page.tsx",
  "app/profile/page.tsx",
  "app/search/page.tsx",
  "app/transactions/page.tsx",
  "app/transfer/page.tsx",
  "app/redirect/page.tsx",
  "app/link-account/page.tsx",
  "app/debug/page.tsx",
  // config
  "next.config.js",
  "middleware.ts",
]);

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file") ?? "";

  if (!file || !ALLOWED_FILES.has(file)) {
    return NextResponse.json({ error: "File not in allowed list" }, { status: 403 });
  }

  try {
    const filePath = path.join(process.cwd(), file);
    const content = fs.readFileSync(filePath, "utf-8");
    return NextResponse.json({ content, path: file });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
