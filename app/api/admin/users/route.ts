// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

// ⚙️ VULNERABLE: No authentication check
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const [users]: any = await db.query(
      `SELECT id, username, password, email, role, balance, account_number, created_at FROM users`,
    );
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}

// ❌ DELETE USER (VULNERABLE TO ID TAMPERING)
export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { id } = await req.json();

    // ⚠️ SQL Injection vulnerability (intentional)
    await db.query(`DELETE FROM users WHERE id = ${id}`);

    return NextResponse.json({
      success: true,
      message: `User ${id} deleted`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}

// 💰 UPDATE BALANCE (VULNERABLE)
export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const { id, balance } = await req.json();

    // ⚠️ No validation, SQLi possible
    await db.query(`UPDATE users SET balance = ${balance} WHERE id = ${id}`);

    return NextResponse.json({
      success: true,
      message: `Balance updated`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}
