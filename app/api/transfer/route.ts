import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getUserFromToken } from "../../../lib/auth";
import { logAttack } from "../../../lib/logAttack";

// ── XSS payload detector ──────────────────────────────────────────────────────
// Catches the most common HTML/JS injection patterns in free-text fields.
function detectXss(value: string): boolean {
  const patterns = [
    /<script[\s>]/i,
    /javascript\s*:/i,
    /on\w+\s*=/i, // onerror=, onload=, onclick=, etc.
    /<iframe/i,
    /<img[^>]+src\s*=\s*['"x]/i,
    /document\.(cookie|location|write)/i,
    /eval\s*\(/i,
    /alert\s*\(/i,
    /fetch\s*\(/i,
    /src\s*=\s*x\b/i, // src=x (classic onerror trigger)
  ];
  return patterns.some((p) => p.test(value));
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let decoded: any;

    try {
      decoded = getUserFromToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 },
      );
    }

    let { toAccount, amount, note } = await req.json();

    // ── XSS detection in note field ─────────────────────────────────────────
    // The transfer page renders `note` via dangerouslySetInnerHTML, making
    // this a stored XSS sink. Log it before it ever touches the DB.
    if (note && detectXss(String(note))) {
      logAttack({
        type: "sqli", // re-using "sqli" type; you can add "xss" to AttackType
        severity: "high",
        ip,
        userId: String(decoded.id),
        username: String(decoded.username),
        detail: `Stored XSS payload in transfer note field from user "${decoded.username}" (id=${decoded.id})`,
        raw: {
          toAccount,
          amount,
          note,
          sink: "transactions.description → transfer page dangerouslySetInnerHTML",
        },
      });
    }

    // ── XSS detection in toAccount (reflected in success banner) ────────────
    if (toAccount && detectXss(String(toAccount))) {
      logAttack({
        type: "sqli",
        severity: "medium",
        ip,
        userId: String(decoded.id),
        username: String(decoded.username),
        detail: `Reflected XSS attempt in toAccount field from user "${decoded.username}"`,
        raw: { toAccount, note },
      });
    }

    toAccount = toAccount.trim().toUpperCase();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return NextResponse.json({ success: false, message: "Invalid amount" });
    }

    const db = await getDb();

    // 💣 Sender transaction (note is stored unsanitized — stored XSS sink)
    const logQuery = `
      INSERT INTO transactions (user_id, amount, description, type)
      VALUES (${decoded.id}, ${parsedAmount}, 'Transfer to ${toAccount}: ${note}', 'debit')
    `;
    await db.query(logQuery);

    // 💸 Deduct sender
    const deductQuery = `
      UPDATE users
      SET balance = balance - ${parsedAmount}
      WHERE id = ${decoded.id}
    `;
    await db.query(deductQuery);

    // 🔍 Find receiver
    const result: any = await db.query(
      `SELECT id FROM users WHERE UPPER(account_number) = '${toAccount}'`,
    );

    const rows = result[0] || result;

    if (rows.length > 0) {
      const receiverId = rows[0].id;

      if (receiverId === decoded.id) {
        return NextResponse.json({
          success: false,
          message: "Cannot transfer to yourself",
        });
      }

      const creditQuery = `
        UPDATE users
        SET balance = balance + ${parsedAmount}
        WHERE id = ${receiverId}
      `;
      await db.query(creditQuery);

      const creditLog = `
        INSERT INTO transactions (user_id, amount, description, type)
        VALUES (${receiverId}, ${parsedAmount}, 'Received from ${decoded.id}: ${note}', 'credit')
      `;
      await db.query(creditLog);
    }

    return NextResponse.json({ success: true, message: "Transfer recorded" });
  } catch (err: any) {
    console.error("TRANSFER ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 },
    );
  }
}
