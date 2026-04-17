import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';

  try {
    const db = await getDb();

    // 🔴 Intentionally vulnerable SQLi
    const sql = `
      SELECT id, username, email, role, balance, account_number
      FROM users
      WHERE username LIKE '%${query}%'
    `;

    const [rows]: any = await db.query(sql);

    return NextResponse.json({
      success: true,
      results: rows,

      // 🔥 Subtle leak instead of obvious answer
      meta: {
        count: rows.length,
        search: query,
      },
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message,

      // 🔥 controlled info leak (useful but not obvious)
      hint: "Query execution failed",
    }, { status: 500 });
  }
}