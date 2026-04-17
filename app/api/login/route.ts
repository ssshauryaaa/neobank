import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { signToken } from "../../../lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  try {
    const db = await getDb();

    // 🔴 VULNERABLE: Direct string concatenation — SQL Injection
    // Exploit: username = ' OR '1'='1'--
    // Exploit: username = admin'--
    const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;

    // console.log('[DEBUG INPUT]', { username, password });
    // console.log('[DEBUG] Login query:', query); // intentionally logged

    const [rows]: any = await db.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password" },
        { status: 401 },
      );
    }

    const user = rows[0];

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

    // keep your vulnerable session cookie
    res.cookies.set("session", String(user.id), {
      path: "/",
    });

    // ✅ ADD THIS (so middleware can detect login)
    res.cookies.set("token", token, {
      path: "/",
      // intentionally still insecure if you want CTF vibe
      // httpOnly: false,
    });

    return res;
  } catch (err: any) {
    // 🔴 VULNERABLE: Full error/stack trace exposed
    return NextResponse.json(
      { success: false, message: err.message, stack: err.stack },
      { status: 500 },
    );
  }
}
