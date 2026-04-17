import { NextResponse } from "next/server";
import { getLogs } from "@/lib/logs";

export async function GET() {
  return NextResponse.json(getLogs());
}
