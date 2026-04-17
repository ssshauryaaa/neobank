import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 🔴 VULNERABLE: userId taken directly from query param, no auth check, no sanitization
  // Exploit: /api/transactions?userId=1 UNION SELECT id,note,note,note,note FROM admin_notes--
  const userId = searchParams.get('userId') || '1';

  try {
    const db = await getDb();

    const query = `SELECT * FROM transactions WHERE user_id=${userId} ORDER BY created_at DESC`;
    // console.log('[DEBUG] Transactions query:', query);

    const [rows]: any = await db.query(query);

    return NextResponse.json({ success: true, transactions: rows });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message,
      stack: err.stack,   // full stack trace exposed
      query: `SELECT * FROM transactions WHERE user_id=${userId}`,  // query exposed!
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { fromUserId, toAccount, amount, description } = await req.json();

  try {
    const db = await getDb();

    // 🔴 VULNERABLE: No balance check, no auth validation, no sanitization
    const insertQuery = `INSERT INTO transactions (user_id, amount, description, type) 
                         VALUES (${fromUserId}, ${amount}, '${description}', 'debit')`;
    await db.query(insertQuery);

    return NextResponse.json({ success: true, message: 'Transaction recorded' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
