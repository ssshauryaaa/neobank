export type AttackType =
  | "jwt_forge"
  | "sqli"
  | "idor"
  | "brute_force"
  | "recon"
  | "xss";

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
    console.error("[logAttack] Failed to ingest attack log");
  }
}

// ── Pattern detectors ──────────────────────────────────────────────────────

/**
 * Detect SQL injection attempts in a string value.
 *
 * MySQL comment syntax quirk:
 *   -- requires a trailing space to be treated as a comment.
 *   So "admin'--" does NOT bypass auth, but "admin'-- " does.
 *   We match both forms:
 *     - "--" followed by whitespace or end-of-string (after trimming)
 *     - the raw sequence "'--" anywhere (covers "admin'-- " when trimmed to "admin'--")
 *   Also catches "#" which is MySQL's single-char comment alternative.
 */
export function detectSqli(value: string): boolean {
  const patterns = [
    // MySQL dash-dash comment — space required, but also match at end-of-trimmed-string
    /--[\s]/, // "-- " with trailing space (the real exploit form)
    /--$/, // "--" at end of string (after any trimming on caller side)
    /#/, // MySQL alternate comment character
    /'\s*--/, // quote followed by -- (catches admin'-- with or without trailing space)

    // Classic injection payloads
    /'\s*(or|and)\s*'?\d/i, // ' OR '1, ' AND 1
    /'\s*or\s*'1'\s*=\s*'1/i, // ' OR '1'='1
    /union\s+select/i, // UNION SELECT
    /;\s*(drop|alter|insert|update|delete)/i,
    /\/\*.*\*\//, // inline comment /**/
    /xp_/i, // SQL Server xp_ procs
    /information_schema/i, // schema enumeration
    /sleep\s*\(/i, // time-based blind
    /benchmark\s*\(/i, // MySQL time-based
    /waitfor\s+delay/i, // MSSQL time-based
  ];
  return patterns.some((p) => p.test(value));
}

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
