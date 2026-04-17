import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { logAttack, detectSqli } from "../../../lib/logAttack";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";

  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // ── SQLi detection on search field ───────────────────────────────────────
  if (detectSqli(query)) {
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

    // 🔴 Intentionally vulnerable SQLi
    const sql = `
      SELECT id, username, email, role, balance, account_number
      FROM users
      WHERE username LIKE '%${query}%'
    `;

    const [rows]: any = await db.query(sql);

    // ── If a UNION/dump payload succeeded, log the data exfil ────────────────
    // Heuristic: if results contain unexpected columns or the injected
    // query returned rows that don't look like real users, flag it.
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

    return NextResponse.json({
      success: true,
      results: rows,
      meta: {
        count: rows.length,
        search: query,
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
