// lib/logAttack.ts
// Drop this into any vulnerable API route to feed the Blue Team defense console.
//
// Usage example (in your /api/user route):
//
//   import { logAttack } from "../../../lib/logAttack";
//
//   // JWT forgery detection
//   if (decodedPayload.role !== originalRole) {
//     await logAttack({
//       type: "jwt_forge",
//       severity: "critical",
//       ip: req.headers.get("x-forwarded-for") ?? "unknown",
//       userId: String(userId),
//       username: decodedPayload.username,
//       detail: `JWT payload forged: role escalated to "${decodedPayload.role}"`,
//       raw: { original: originalRole, forged: decodedPayload.role, token },
//     });
//   }

export type AttackType =
  | "jwt_forge"
  | "sqli"
  | "idor"
  | "brute_force"
  | "recon";
export type Severity = "critical" | "high" | "medium" | "low";

export type AttackPayload = {
  type: AttackType;
  severity: Severity;
  ip: string;
  userId?: string | null;
  username?: string | null;
  detail: string;
  raw?: Record<string, unknown>;
};

export async function logAttack(payload: AttackPayload): Promise<void> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window === "undefined"
        ? "http://localhost:3000"
        : window.location.origin);

    await fetch(`${base}/api/defense/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ingest", ...payload }),
    });
  } catch {
    // Never crash the main request because of logging
    console.error("[logAttack] Failed to ingest attack log");
  }
}

// ── Pattern detectors ──────────────────────────────────────────────────────
// Call these from your route handlers.

/** Detect JWT payload forgery — compare decoded token to DB truth */
export function detectJwtForgery(
  decoded: Record<string, unknown>,
  dbUser: { id: number; role: string; username: string },
): { forged: boolean; detail: string } {
  if (String(decoded.id) !== String(dbUser.id)) {
    return {
      forged: true,
      detail: `IDOR via JWT: token id=${decoded.id}, DB id=${dbUser.id}`,
    };
  }
  if (decoded.role !== dbUser.role) {
    return {
      forged: true,
      detail: `Role escalation: token role="${decoded.role}", DB role="${dbUser.role}"`,
    };
  }
  return { forged: false, detail: "" };
}

/** Detect SQL injection attempts in a string value */
export function detectSqli(value: string): boolean {
  const patterns = [
    /'\s*(or|and)\s*'?\d/i,
    /union\s+select/i,
    /--\s/,
    /;\s*(drop|alter|insert|update|delete)/i,
    /\/\*.*\*\//,
    /xp_/i,
    /information_schema/i,
  ];
  return patterns.some((p) => p.test(value));
}
