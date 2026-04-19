import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 🔴 VULNERABLE: userId taken directly from query param
  // No auth check. No sanitization. Passed raw into SQL.
  //
  // IDOR exploit:   /api/transactions?userId=2
  //                 /api/transactions?userId=3
  //
  // SQLi exploits:  /api/transactions?userId=1 OR 1=1
  //                 /api/transactions?userId=1 UNION SELECT id,username,email,password_hash,role,balance,account_number,created_at FROM users--
  //                 /api/transactions?userId=1; DROP TABLE transactions--

  const userId = searchParams.get("userId") || "1";

  try {
    const db = await getDb();

    const query = `SELECT * FROM transactions WHERE user_id=${userId} ORDER BY created_at DESC`;

    // console.log("[DEBUG] Transactions query:", query);

    const [rows]: any = await db.query(query);

    return NextResponse.json({
      success: true,
      transactions: rows,
      // 🔴 Leaks the raw query back to the client on success
      query,
      meta: {
        count: rows.length,
        userId,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
        stack: err.stack, // 🔴 full stack trace exposed
        query: `SELECT * FROM transactions WHERE user_id=${userId}`, // 🔴 raw query exposed
        hint: "Query execution failed — check your syntax",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  // 🔴 VULNERABLE: No balance check, no auth validation, no sanitization
  // Values injected directly into INSERT string.
  // Exploit: set fromUserId to any user, amount to any value, description to SQL payload.

  const { fromUserId, toAccount, amount, description } = await req.json();

  try {
    const db = await getDb();

    const insertQuery = `
      INSERT INTO transactions (user_id, amount, description, type)
      VALUES (${fromUserId}, ${amount}, '${description}', 'debit')
    `;

    await db.query(insertQuery);

    return NextResponse.json({
      success: true,
      message: "Transaction recorded",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}
