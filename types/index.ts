export type Severity = "critical" | "high" | "medium" | "low";
export type AttackType =
  | "jwt_forge"
  | "sqli_login"
  | "sqli_search"
  | "idor"
  | "xss"
  | "sqli_txn"         // /api/transactions GET — userId raw interpolation + IDOR
  | "sqli_txn_insert"  // /api/transactions POST — INSERT string concatenation
  | "xss_txn"          // transactions page — raw JSON / description rendered unsafely
  | "open_redirect"    // /redirect?next= — unvalidated external redirect
  | "xss_profile"      // /profile page — stored XSS via bio rendered as innerHTML
  | "mass_assignment"; // /api/profile PATCH — accepts role/balance with no whitelist
export type FilterTab = "all" | "acknowledged" | "fixed";
export type ChallengeResult = "idle" | "running" | "pass" | "fail";

export type LogEntry = {
  id: string;
  ts: number;
  type: AttackType;
  severity: Severity;
  ip: string;
  port: number;
  user: string;
  detail: string;
  endpoint: string;
  method: string;
  statusCode: number;
  userAgent: string;
  payload: string;
  country: string;
  patched: boolean;
  detected: boolean;
};

export type ScoreEntry = {
  points: number;
  ts: number;
  detail: string;
  type: AttackType;
};

// ── Challenge shapes ──────────────────────────────────────────────────────────

export type ValidationResult = { pass: boolean; feedback: string };

export type TwoFileChallenge = {
  kind: "two-file";
  title: string;
  description: string;
  points: number;
  attackLabel: string;
  attackColor: string;
  attackBg: string;
  attackBorder: string;
  /** Ordered tab keys, e.g. ["route","page"] or ["auth","route"] */
  tabs: string[];
  tabLabels: Record<string, string>;
  startCodes: Record<string, string>;
  hints: Record<string, string[]>;
  validate: Record<string, (code: string) => ValidationResult>;
  diffVulnLines: Record<string, RegExp>;
  fixLines: Record<string, string[]>;
};

export type SingleChallenge = {
  kind: "single";
  title: string;
  description: string;
  points: number;
  starterCode: string;
  hints: string[];
  validate: (code: string) => ValidationResult;
};

export type Challenge = TwoFileChallenge | SingleChallenge;
