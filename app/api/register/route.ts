import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { signToken } from '../../../lib/auth';

export async function POST(req: NextRequest) {
  const { username, password, email } = await req.json();

  try {
    const db = await getDb();

    // Check if user exists - also vulnerable to SQLi
    const checkQuery = `SELECT id FROM users WHERE username='${username}'`;
    const [existing]: any = await db.query(checkQuery);

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: false, message: 'Username already taken' }, { status: 400 });
    }

    // 🔴 VULNERABLE: Password stored in plain text, no hashing
    // 🔴 VULNERABLE: No input sanitization
    const accountNum = `NEO-${Math.floor(1000 + Math.random() * 9000)}-${username.toUpperCase().slice(0, 4)}`;
    const insertQuery = `INSERT INTO users (username, password, email, role, balance, account_number) 
                         VALUES ('${username}', '${password}', '${email}', 'user', 1000.00, '${accountNum}')`;

    const [result]: any = await db.query(insertQuery);

    const token = signToken({ id: result.insertId, username, role: 'user' });

    return NextResponse.json({ success: true, token, message: 'Account created successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, stack: err.stack }, { status: 500 });
  }
}
