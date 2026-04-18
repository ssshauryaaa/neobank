import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { logAttack, detectSqli } from "../../../lib/logAttack";
import fs from "fs";
import path from "path";

// ── Patch state: written by /api/patch when the defense console deploys a fix
// Falls back to an env var so production deploys can force-patch without a file.
function isSqliPatched(): boolean {
  if (process.env.PATCHED_SQLI === "1") return true;
  try {
    const flagFile = path.join(process.cwd(), ".patch-flags", "sqli");
    return fs.existsSync(flagFile);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const patched = isSqliPatched();

  // ── SQLi detection ────────────────────────────────────────────────────────
  if (detectSqli(query)) {
    if (patched) {
      // Patch is live — log the blocked attempt and reject it
      logAttack({
        type: "sqli",
        severity: "high",
        ip,
        userId: null,
        username: null,
        detail: `[BLOCKED] SQL injection attempt in /api/search — parameterized queries active: "${query}"`,
        raw: { query, blocked: true },
      });
      return NextResponse.json(
        { success: false, message: "Invalid search query." },
        { status: 400 },
      );
    }

    // Vulnerable path — log the attempt
    logAttack({
      type: "sqli",
      severity: "high",
      ip,
      userId: null,
      username: null,
      detail: `SQL injection attempt in /api/search query param: "${query}"`,
      raw: { query },
    });
  }

  try {
    const db = await getDb();

    let rows: any[];

    if (patched) {
      // ✅ PATCHED — parameterized query, injection-safe
      const [result]: any = await db.query(
        "SELECT id, username, email, role, balance, account_number FROM users WHERE username LIKE ?",
        [`%${query}%`],
      );
      rows = result;
    } else {
      // 🔴 VULNERABLE — raw string interpolation, intentionally exploitable
      const sql = `
        SELECT id, username, email, role, balance, account_number
        FROM users
        WHERE username LIKE '%${query}%'
      `;
      const [result]: any = await db.query(sql);
      rows = result;

      // If a UNION/dump payload succeeded, log the data exfil
      const suspiciousResult = detectSqli(query) && rows && rows.length > 0;
      if (suspiciousResult) {
        logAttack({
          type: "sqli",
          severity: "critical",
          ip,
          userId: null,
          username: null,
          detail: `SQL injection on /api/search returned ${rows.length} row(s) — possible data exfiltration`,
          raw: { query, sql, row_count: rows.length, sample: rows.slice(0, 2) },
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: rows,
      meta: {
        count: rows.length,
        search: query,
        patched,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
        hint: "Query execution failed",
      },
      { status: 500 },
    );
  }
}
