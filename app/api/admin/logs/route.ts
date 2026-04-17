import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const [logs]: any = await db.query(
      `SELECT * FROM server_logs ORDER BY created_at DESC`,
    );
    const [notes]: any = await db.query(`SELECT * FROM admin_notes`);
    return NextResponse.json({
      success: true,
      logs,
      admin_notes: notes, // 🔴 Flags exposed here
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message, stack: err.stack },
      { status: 500 },
    );
  }
}
