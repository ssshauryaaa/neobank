import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getUserFromToken } from "../../../lib/auth";

export async function POST(req: NextRequest) {
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
    // console.log("RAW INPUT:", { toAccount, amount, note });

    // 🔥 normalize input (ADD THIS RIGHT HERE)
    toAccount = toAccount.trim().toUpperCase();
    console.log("Normalized toAccount:", toAccount);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return NextResponse.json({
        success: false,
        message: "Invalid amount",
      });
    }

    const db = await getDb();

    // 💣 Sender transaction
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
    // console.log("RAW DB RESULT:", result);

    const rows = result[0] || result;
    // console.log("PROCESSED ROWS:", rows);

    if (rows.length > 0) {
      const receiverId = rows[0].id;
      // console.log("RECEIVER FOUND:", rows[0]);

      if (receiverId === decoded.id) {
        return NextResponse.json({
          success: false,
          message: "Cannot transfer to yourself",
        });
      }
      // 💸 Add to receiver
      const creditQuery = `
        UPDATE users
        SET balance = balance + ${parsedAmount}
        WHERE id = ${receiverId}
      `;
      await db.query(creditQuery);

      // 📜 Receiver log
      const creditLog = `
        INSERT INTO transactions (user_id, amount, description, type)
        VALUES (${receiverId}, ${parsedAmount}, 'Received from ${decoded.id}: ${note}', 'credit')
      `;
      await db.query(creditLog);
    }

    // ✅ ALWAYS RETURN
    return NextResponse.json({
      success: true,
      message: "Transfer recorded",
    });
  } catch (err: any) {
    console.error("TRANSFER ERROR:", err); // 👈 VERY IMPORTANT

    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 },
    );
  }
}
