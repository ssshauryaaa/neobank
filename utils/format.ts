import type { AttackType, LogEntry } from "@/types";

/** Format a timestamp as HH:MM:SS */
export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Format elapsed seconds as MM:SS */
export function fmtElapsed(s: number): string {
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

/** All valid AttackType values — used to validate entries from localStorage */
const VALID_ATTACK_TYPES = new Set<string>([
  "jwt_forge",
  "sqli_login",
  "sqli_search",
  "idor",
  "xss",
  "sqli_txn",
  "sqli_txn_insert",
  "xss_txn",
]);

/**
 * Normalise real-attack log entries written by the app pages into localStorage.
 *
 * Pages may emit coarse type strings like "sqli" or "xss" — we map those to
 * the most specific AttackType based on endpoint / payload / detail signals.
 * Entries with already-valid types are passed through unchanged.
 * Entries with completely unknown types are dropped (return null).
 */
export function normaliseAttackType(e: any): LogEntry | null {
  if (!e || typeof e !== "object") return null;

  const raw: string = (e.type ?? "").toLowerCase();
  const endpoint: string = (e.endpoint ?? "").toLowerCase();
  const detail: string = (e.detail ?? "").toLowerCase();
  const payload: string = (e.payload ?? "").toLowerCase();

  // Already a valid specific type — pass through directly
  if (VALID_ATTACK_TYPES.has(raw)) return e as LogEntry;

  // ── Coarse "sqli" — route to specific subtype ────────────────────────────
  if (raw === "sqli") {
    if (
      endpoint.includes("/transactions") ||
      detail.includes("transaction") ||
      payload.includes("user_id")
    )
      return { ...e, type: "sqli_txn" as AttackType };
    if (
      endpoint.includes("/search") ||
      detail.includes("search") ||
      payload.includes("query=")
    )
      return { ...e, type: "sqli_search" as AttackType };
    if (
      endpoint.includes("/login") ||
      detail.includes("login") ||
      detail.includes("auth bypass")
    )
      return { ...e, type: "sqli_login" as AttackType };
    // fallback for unspecified sqli
    return { ...e, type: "sqli_login" as AttackType };
  }

  // ── Coarse "xss" — route to specific subtype ─────────────────────────────
  if (raw === "xss") {
    if (
      endpoint.includes("/transactions") ||
      detail.includes("transaction") ||
      detail.includes("json.stringify") ||
      detail.includes("password_hash") ||
      payload.includes("user_id=") ||
      payload.includes("description=")
    )
      return { ...e, type: "xss_txn" as AttackType };
    // default xss stays as xss (transfer note / search)
    return { ...e, type: "xss" as AttackType };
  }

  // ── Coarse "idor" ─────────────────────────────────────────────────────────
  if (raw === "idor" || raw === "idor_txn") {
    if (endpoint.includes("/transactions") || detail.includes("transaction"))
      return { ...e, type: "sqli_txn" as AttackType }; // transactions IDOR is part of sqli_txn challenge
    return { ...e, type: "idor" as AttackType };
  }

  // Unknown type — drop the entry rather than showing a broken row
  console.warn(
    "[defense] dropping real-attack entry with unknown type:",
    raw,
    e,
  );
  return null;
}
