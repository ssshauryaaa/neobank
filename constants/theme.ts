import type { AttackType, Severity } from "@/types";

// ── Typography ────────────────────────────────────────────────────────────────
export const mono = "'JetBrains Mono','Fira Code',monospace";
export const sans = "'IBM Plex Sans',system-ui,sans-serif";

// ── Color palette ─────────────────────────────────────────────────────────────
export const C = {
  bg0: "#09090b",
  bg1: "#18181b",
  bg2: "#27272a",
  bg3: "#3f3f46",
  border: "#27272a",
  border2: "#3f3f46",
  green: "#10b981",
  greenDim: "rgba(16,185,129,0.1)",
  greenBorder: "rgba(16,185,129,0.2)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.1)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.1)",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  text0: "#fafafa",
  text1: "#a1a1aa",
  text2: "#71717a",
  text3: "#52525b",
} as const;

// ── Severity config ───────────────────────────────────────────────────────────
export const SEV_CONFIG: Record<
  Severity,
  { color: string; bg: string; border: string; dot: string; label: string }
> = {
  critical: {
    color: "#b91c1c",
    bg: "#fff1f1",
    border: "#fca5a5",
    dot: "#ef4444",
    label: "CRITICAL",
  },
  high: {
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fdba74",
    dot: "#f97316",
    label: "HIGH",
  },
  medium: {
    color: "#a16207",
    bg: "#fefce8",
    border: "#fde047",
    dot: "#eab308",
    label: "MEDIUM",
  },
  low: {
    color: "#0d9488",
    bg: "#f0fdfa",
    border: "#5eead4",
    dot: "#14b8a6",
    label: "LOW",
  },
};

// ── Attack type labels & colors ───────────────────────────────────────────────
export const TYPE_LABELS: Record<AttackType, string> = {
  jwt_forge: "JWT FORGERY",
  sqli_login: "SQLI — LOGIN",
  sqli_search: "SQLI — SEARCH",
  idor: "IDOR ATTACK",
  xss: "XSS INJECTION",
  sqli_txn: "SQLI — TRANSACTIONS",
  sqli_txn_insert: "SQLI — TXN INSERT",
  xss_txn: "XSS — TRANSACTIONS",
};

export const TYPE_COLORS: Record<
  AttackType,
  { text: string; bg: string; border: string }
> = {
  jwt_forge: { text: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  sqli_login: { text: "#b91c1c", bg: "#fff1f1", border: "#fca5a5" },
  sqli_search: { text: "#be185d", bg: "#fdf2f8", border: "#f9a8d4" },
  idor: { text: "#0369a1", bg: "#eff6ff", border: "#bae6fd" },
  xss: { text: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  sqli_txn: { text: "#9a3412", bg: "#fff7ed", border: "#fb923c" },
  sqli_txn_insert: { text: "#7c2d12", bg: "#fef3c7", border: "#fbbf24" },
  xss_txn: { text: "#065f46", bg: "#ecfdf5", border: "#6ee7b7" },
};

// ── Patch key mapping ─────────────────────────────────────────────────────────
export const PATCH_KEYS: Record<string, string> = {
  sqli_login: "patched_sqli",
  sqli_search: "patched_sqli_search",
  jwt_forge: "patched_jwt",
  xss: "patched_xss",
  idor: "patched_idor",
  sqli_txn: "patched_sqli_txn",
  sqli_txn_insert: "patched_sqli_txn_insert",
  xss_txn: "patched_xss_txn", // ← NEW
};

export const PATCH_TARGET_MAP: Partial<Record<string, string>> = {
  sqli_login: "sqli_login",
  sqli_search: "sqli_search",
  jwt_forge: "jwt_forge",
  xss: "xss",
  idor: "idor",
  sqli_txn: "sqli_txn",
  sqli_txn_insert: "sqli_txn_insert",
  xss_txn: "xss_txn", // ← NEW
};
