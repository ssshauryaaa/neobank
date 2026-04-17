import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { signToken } from "../../../lib/auth";
import { logAttack, detectSqli } from "../../../lib/logAttack";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // ── SQLi detection on login form ──────────────────────────────────────────
  const sqliInUsername = detectSqli(username ?? "");
  const sqliInPassword = detectSqli(password ?? "");

  if (sqliInUsername || sqliInPassword) {
    // Fire-and-forget — never block the (vulnerable) login path
    logAttack({
      type: "sqli",
      severity: "critical",
      ip,
      userId: null,
      username: String(username),
      detail: sqliInUsername
        ? `SQL injection in username field: "${username}"`
        : `SQL injection in password field: "${password}"`,
      raw: {
        username,
        password,
        field: sqliInUsername ? "username" : "password",
      },
    });
  }

  try {
    const db = await getDb();

    // 🔴 VULNERABLE: Direct string concatenation — SQL Injection
    // Exploit: username = ' OR '1'='1'--
    // Exploit: username = admin'--
    const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;

    const [rows]: any = await db.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password" },
        { status: 401 },
      );
    }

    const user = rows[0];

    // ── If SQLi succeeded, log that we have a confirmed bypass ───────────────
    if (sqliInUsername || sqliInPassword) {
      logAttack({
        type: "sqli",
        severity: "critical",
        ip,
        userId: String(user.id),
        username: String(user.username),
        detail: `SQL injection login bypass SUCCEEDED — authenticated as user "${user.username}" (id=${user.id})`,
        raw: {
          injected_query: query,
          authenticated_user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
        },
      });
    }

    // 🔵 VULNERABLE: Weak JWT secret, no algorithm restriction, role trusted from DB
    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    });

    const res = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        account_number: user.account_number,
      },
    });

    res.cookies.set("session", String(user.id), { path: "/" });
    res.cookies.set("token", token, { path: "/" });

    return res;
  } catch (err: any) {
    // 🔴 VULNERABLE: Full error/stack trace exposed
    return NextResponse.json(
      { success: false, message: err.message, stack: err.stack },
      { status: 500 },
    );
  }
}
