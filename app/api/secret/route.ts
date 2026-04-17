import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { getUserFromToken } from '../../../lib/auth';

// Hidden endpoint — discoverable via /api/debug or directory brute-force
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const decoded: any = getUserFromToken(token);

  // Only "admin" role gets the secret — but JWT can be forged!
  // Exploit: forge JWT with role: "admin" using weak secret "secret"
  if (!decoded || decoded.role !== 'admin') {
    return NextResponse.json({
      success: false,
      message: 'Admin access required',
      hint: 'Maybe your JWT token can be... modified?',
    }, { status: 403 });
  }

  try {
    const db = await getDb();
    const [notes]: any = await db.query(`SELECT * FROM admin_notes`);

    return NextResponse.json({
      success: true,
      message: 'Welcome, admin. You found the secret endpoint.',
      flag: 'flag{jwt_forged_like_a_pro}',
      admin_notes: notes,
      secret_data: {
        master_key: 'MK-4829-ALPHA',
        vault_code: '7734',
        internal_flag: 'flag{secret_api_endpoint_found}',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
