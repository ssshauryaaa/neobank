import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getUserFromToken } from "../../../lib/auth";

// GET /api/profile — return logged-in user's profile (including bio)
export async function GET(req: NextRequest) {
  const token =
    req.headers.get("Authorization")?.replace("Bearer ", "") ??
    req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded: any = getUserFromToken(token);
    const db = await getDb();
    const [rows]: any = await db.query(
      "SELECT id, username, email, role, balance, account_number, bio FROM users WHERE id = ?",
      [decoded.id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PATCH /api/profile — update user profile
// 🔴 VULNERABLE: Mass Assignment — blindly applies ALL request body fields to the DB
// Exploit: send {"role":"admin","balance":999999} alongside the normal fields
export async function PATCH(req: NextRequest) {
  const token =
    req.headers.get("Authorization")?.replace("Bearer ", "") ??
    req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded: any = getUserFromToken(token);
    const body = await req.json();

    // 🔴 FIX THIS: build the SET clause from ALL body fields with no whitelist
    // An attacker can pass role:"admin" or balance:999999 alongside legit fields
    const fields = Object.keys(body);
    if (fields.length === 0) {
      return NextResponse.json({ success: false, message: "No fields provided" }, { status: 400 });
    }

    const setClauses = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => body[f]);

    const db = await getDb();

    // 🔴 VULNERABLE: raw interpolation of field names (cannot be parameterized)
    await db.query(
      `UPDATE users SET ${setClauses} WHERE id = ?`,
      [...values, decoded.id]
    );

    // Return the updated user
    const [rows]: any = await db.query(
      "SELECT id, username, email, role, balance, account_number, bio FROM users WHERE id = ?",
      [decoded.id]
    );

    return NextResponse.json({
      success: true,
      message: "Profile updated",
      user: rows[0],
      // 🔴 FIX THIS: remove this debug info from the response
      debug: { updatedFields: fields, sqlFragment: `SET ${setClauses}` },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, stack: err.stack }, { status: 500 });
  }
}
