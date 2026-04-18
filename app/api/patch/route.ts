import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ── Valid patch targets ────────────────────────────────────────────────────
const VALID_PATCHES = ["sqli", "jwt", "xss", "idor"] as const;
type PatchTarget = (typeof VALID_PATCHES)[number];

// ── Writes / removes a flag file under .patch-flags/<target>
// The flag directory is created if it doesn't exist.
// Called by the defense console (client) after a successful code challenge.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, action } = body as {
      target: PatchTarget;
      action: "apply" | "revert";
    };

    if (!VALID_PATCHES.includes(target)) {
      return NextResponse.json(
        { success: false, message: "Unknown patch target" },
        { status: 400 },
      );
    }

    const flagDir = path.join(process.cwd(), ".patch-flags");
    const flagFile = path.join(flagDir, target);

    // Ensure the directory exists
    if (!fs.existsSync(flagDir)) {
      fs.mkdirSync(flagDir, { recursive: true });
    }

    if (action === "apply") {
      fs.writeFileSync(flagFile, "1", "utf8");
    } else if (action === "revert") {
      if (fs.existsSync(flagFile)) fs.unlinkSync(flagFile);
    } else {
      return NextResponse.json(
        { success: false, message: "action must be 'apply' or 'revert'" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, target, action });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}

// ── GET: check which patches are currently applied ─────────────────────────
export async function GET() {
  const flagDir = path.join(process.cwd(), ".patch-flags");
  const applied: string[] = [];
  for (const target of VALID_PATCHES) {
    const flagFile = path.join(flagDir, target);
    if (fs.existsSync(flagFile)) applied.push(target);
  }
  return NextResponse.json({ success: true, applied });
}
