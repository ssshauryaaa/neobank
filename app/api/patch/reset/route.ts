import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST() {
  try {
    const flagDir = path.join(process.cwd(), ".patch-flags");
    if (fs.existsSync(flagDir)) {
      fs.readdirSync(flagDir).forEach((f) => {
        fs.unlinkSync(path.join(flagDir, f));
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}
