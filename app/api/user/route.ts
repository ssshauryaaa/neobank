// app/api/user/route.ts
// Same vulnerable route as before, but now logs attacks to the Defense Console.

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getUserFromToken } from "../../../lib/auth";
import {
  logAttack,
  detectJwtForgery,
  detectSqli,
} from "../../../lib/logAttack";

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const authHeader = req.headers.get("Authorization");
  let token = authHeader?.replace("Bearer ", "");
  if (!token) token = req.cookies.get("token")?.value;

  const decoded: any = getUserFromToken(token);
  const userId = decoded?.id;

  if (!userId) {
    // Log reconnaissance / invalid token probe
    await logAttack({
      type: "recon",
      severity: "low",
      ip,
      detail: "Request with missing or invalid JWT — possible reconnaissance",
      raw: { authHeader, token: token?.slice(0, 40) },
    });
    return NextResponse.json(
      { success: false, message: "Unauthorized (no id in token)" },
      { status: 401 },
    );
  }

  // ── Detect SQL Injection in userId ─────────────────────────────────────
  if (detectSqli(String(userId))) {
    await logAttack({
      type: "sqli",
      severity: "critical",
      ip,
      userId: String(userId),
      username: decoded?.username ?? null,
      detail: `SQL Injection attempt in user ID field: "${String(userId).slice(0, 80)}"`,
      raw: { userId, token: token?.slice(0, 40) },
    });
    // Still execute the vulnerable query below so attackers can exploit it
    // (this is intentional for the competition)
  }

  try {
    const db = await getDb();

    // 🔴 VULNERABLE: SQL Injection + IDOR (intentional for Breach@trix)
    const query = `
      SELECT id, username, email, role, balance, account_number, created_at
      FROM users
      WHERE id=${userId}
    `;
    const [rows]: any = await db.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const dbUser = rows[0];

    // ── Detect JWT Forgery (IDOR / privilege escalation) ─────────────────
    const { forged, detail } = detectJwtForgery(decoded, dbUser);
    if (forged) {
      await logAttack({
        type: decoded.role !== dbUser.role ? "jwt_forge" : "idor",
        severity: "critical",
        ip,
        userId: String(decoded.id),
        username: decoded.username ?? null,
        detail,
        raw: {
          decodedId: decoded.id,
          decodedRole: decoded.role,
          dbId: dbUser.id,
          dbRole: dbUser.role,
          token: token?.slice(0, 60),
        },
      });
    }

    return NextResponse.json({ success: true, user: dbUser });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message, stack: err.stack },
      { status: 500 },
    );
  }
}
