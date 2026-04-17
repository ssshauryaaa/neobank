import { NextRequest, NextResponse } from "next/server";
import { getDefense, updateDefense } from "@/lib/defense";

export async function GET() {
  return NextResponse.json(getDefense());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  updateDefense(body);

  return NextResponse.json({
    success: true,
    config: getDefense(),
  });
}
