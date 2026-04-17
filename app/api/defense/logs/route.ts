// app/api/defense/logs/route.ts
// Blue Team API — read attack logs + submit defense actions

import { NextRequest, NextResponse } from "next/server";

// ── In-memory log store (replace with DB in production) ──────────────────
// In a real deployment, use Redis or your DB so logs persist across instances.
declare global {
  var __attackLogs: AttackLog[] | undefined;
  var __defenseActions: DefenseRecord[] | undefined;
}

if (!global.__attackLogs) global.__attackLogs = [];
if (!global.__defenseActions) global.__defenseActions = [];

export type AttackLog = {
  id: string;
  ts: number;
  type: "jwt_forge" | "sqli" | "idor" | "brute_force" | "recon";
  severity: "critical" | "high" | "medium" | "low";
  ip: string;
  userId: string | null;
  username: string | null;
  detail: string;
  raw: Record<string, unknown>;
  // Defense state
  detected: boolean;
  patched: boolean;
  blocked: boolean;
};

type DefenseRecord = {
  logId: string;
  action: "detect" | "patch" | "block" | "restore";
  ts: number;
  defenderId: string;
  points: number;
};

const ACTION_POINTS: Record<DefenseRecord["action"], number> = {
  detect: 40,
  patch: 60,
  block: 50,
  restore: 30,
};

// ── GET /api/defense/logs ─────────────────────────────────────────────────
// Returns all attack logs, newest first.
export async function GET(req: NextRequest) {
  // Simple auth: check for a defender token header
  const role = req.headers.get("x-defender-role");
  if (role !== "defender" && role !== "admin") {
    return NextResponse.json(
      { success: false, message: "Unauthorized — defenders only" },
      { status: 403 },
    );
  }

  const logs = [...(global.__attackLogs ?? [])].reverse();
  return NextResponse.json({ success: true, logs, count: logs.length });
}

// ── POST /api/defense/logs ────────────────────────────────────────────────
// Two sub-actions:
//   action: "ingest"  — called internally when an attack is detected
//   action: "defend"  — called by Blue Team to take a defensive action
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  // ── Internal ingest (called from your vulnerable API routes) ──────────
  if (body.action === "ingest") {
    const log: AttackLog = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      type: body.type ?? "recon",
      severity: body.severity ?? "low",
      ip: body.ip ?? "unknown",
      userId: body.userId ?? null,
      username: body.username ?? null,
      detail: body.detail ?? "",
      raw: body.raw ?? {},
      detected: false,
      patched: false,
      blocked: false,
    };
    global.__attackLogs!.push(log);
    // Keep last 500 logs
    if (global.__attackLogs!.length > 500) {
      global.__attackLogs = global.__attackLogs!.slice(-500);
    }
    return NextResponse.json({ success: true, logId: log.id });
  }

  // ── Defense action (called from the Defense page) ──────────────────────
  if (body.action === "defend") {
    const { logId, defenseAction, defenderId } = body as {
      logId: string;
      defenseAction: DefenseRecord["action"];
      defenderId: string;
    };

    if (!logId || !defenseAction || !defenderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing logId, defenseAction, or defenderId",
        },
        { status: 400 },
      );
    }

    const log = global.__attackLogs!.find((l) => l.id === logId);
    if (!log) {
      return NextResponse.json(
        { success: false, message: "Log not found" },
        { status: 404 },
      );
    }

    // Validation
    if (defenseAction === "detect" && log.detected) {
      return NextResponse.json(
        {
          success: false,
          message: "Already detected — no points awarded",
          penalty: 0,
        },
        { status: 409 },
      );
    }
    if (defenseAction === "patch" && !log.detected) {
      return NextResponse.json(
        {
          success: false,
          message: "Must detect before patching",
          penalty: -20,
        },
        { status: 422 },
      );
    }
    if (defenseAction === "patch" && log.patched) {
      return NextResponse.json(
        { success: false, message: "Already patched", penalty: 0 },
        { status: 409 },
      );
    }
    if (defenseAction === "block" && log.blocked) {
      return NextResponse.json(
        { success: false, message: "Already blocked", penalty: 0 },
        { status: 409 },
      );
    }

    // Apply
    if (defenseAction === "detect") log.detected = true;
    if (defenseAction === "patch") log.patched = true;
    if (defenseAction === "block") log.blocked = true;

    const record: DefenseRecord = {
      logId,
      action: defenseAction,
      ts: Date.now(),
      defenderId,
      points: ACTION_POINTS[defenseAction],
    };
    global.__defenseActions!.push(record);

    return NextResponse.json({
      success: true,
      points: record.points,
      message: `+${record.points} points — ${defenseAction} successful`,
      log,
    });
  }

  return NextResponse.json(
    { success: false, message: "Unknown action" },
    { status: 400 },
  );
}
