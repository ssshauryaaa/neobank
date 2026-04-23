// ── SQLi Login — starter code ──────────────────────────────────────────────────

export const SQLI_LOGIN_ROUTE_STARTER = `import { NextRequest, NextResponse } from "next/server";
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
      type: "sqli", severity: "critical", ip, userId: null,
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
    const token = signToken({ id: user.id, username: user.username, role: user.role, email: user.email });

    const res = NextResponse.json({
      success: true, token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, balance: user.balance, account_number: user.account_number },
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

export const SQLI_LOGIN_PAGE_STARTER = `"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PATCH_KEY = "patched_sqli";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sqliFixed, setSqliFixed] = useState(false);
  const [attackBlocked, setAttackBlocked] = useState(false);
  const [lastAttack, setLastAttack] = useState(null);

  useEffect(() => {
    const check = () => setSqliFixed(localStorage.getItem(PATCH_KEY) === "1");
    check();
    const iv = setInterval(check, 800);
    return () => clearInterval(iv);
  }, []);

  function detectSqliPattern(val) {
    return (
      /'\s*(or|and)\s*'?\d/i.test(val) ||
      /'\s*or\s+1\s*=\s*1/i.test(val) ||
      /--[\s]/.test(val) || /--$/.test(val.trim()) ||
      /'\s*--/.test(val) || /#/.test(val) ||
      /union\s+select/i.test(val) ||
      /;\s*(drop|alter|insert|select)/i.test(val)
    );
  }

  function pushRealAttack(username, payload, succeeded) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      ts: Date.now(), type: "sqli", severity: "critical",
      ip: "REAL ATTACKER", port: 443, user: username || "anon",
      detail: succeeded
        ? \`✦ REAL ATTACK — Auth bypass SUCCEEDED via SQLi: "\${username}" authenticated as admin\`
        : \`✦ REAL ATTACK — SQLi attempt detected in login form: "\${username}"\`,
      endpoint: "/api/login", method: "POST",
      statusCode: succeeded ? 200 : 401,
      userAgent: navigator.userAgent.slice(0, 60),
      payload: \`username=\${payload}&password=<redacted>\`,
      country: "LIVE", patched: false,
    };
    try {
      const existing = JSON.parse(localStorage.getItem("real_attack_log") || "[]");
      existing.unshift(entry);
      localStorage.setItem("real_attack_log", JSON.stringify(existing.slice(0, 50)));
    } catch {}
  }

  // 🔴 FIX THIS: when sqliFixed && isInjection, block the request early.
  // Add: setAttackBlocked(true), setLastAttack(username), pushRealAttack(...), return.
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAttackBlocked(false);
    setLastAttack(null);

    const isInjection = detectSqliPattern(username) || detectSqliPattern(password);

    // TODO: add blocking logic here when sqliFixed === true
    if (isInjection) pushRealAttack(username, username, false);

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
        router.push("/dashboard");
      } else {
        setError(isInjection ? "Invalid credentials. (Injection attempt logged.)" : data.message || "Invalid username or password.");
      }
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      {sqliFixed && <div>Protection Active — parameterized queries enabled</div>}
      {attackBlocked && <div>Threat Intercepted — payload blocked: <code>{lastAttack}</code></div>}
      <form onSubmit={handleLogin}>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      {error && <div>{error}</div>}
    </div>
  );
}`;

// ── SQLi Search — starter code ────────────────────────────────────────────────

export const SQLI_SEARCH_ROUTE_STARTER = `import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { logAttack, detectSqli } from "../../../lib/logAttack";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  if (detectSqli(query)) {
    logAttack({ type: "sqli", severity: "high", ip, userId: null, username: null,
      detail: \`SQL injection attempt in /api/search query param: "\${query}"\`, raw: { query } });
  }

  try {
    const db = await getDb();

    // 🔴 FIX THIS: raw string interpolation is exploitable
    // Payload: ' UNION SELECT id,username,password,email,balance,account_number FROM users--
    const sql = \`SELECT id, username, email, role, balance, account_number
      FROM users WHERE username LIKE '%\${query}%'\`;
    const [result]: any = await db.query(sql);

    return NextResponse.json({ success: true, results: result, meta: { count: result.length, search: query } });

  } catch (err: any) {
    // 🔴 FIX THIS: never expose stack traces in production
    return NextResponse.json(
      { success: false, message: err.message, stack: err.stack, hint: "Query execution failed" },
      { status: 500 }
    );
  }
}`;

export const SQLI_SEARCH_PAGE_STARTER = `"use client";
import { useState, useEffect } from "react";

const PATCH_KEY = "patched_sqli_search";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sqliFixed, setSqliFixed] = useState(false);
  const [attackBlocked, setAttackBlocked] = useState(false);
  const [lastAttack, setLastAttack] = useState(null);

  useEffect(() => {
    const check = () => setSqliFixed(localStorage.getItem(PATCH_KEY) === "1");
    check();
    const iv = setInterval(check, 800);
    return () => clearInterval(iv);
  }, []);

  function detectSqliPattern(val) {
    return (
      /'\s*(or|and)\s*'?\d/i.test(val) ||
      /--[\s]/.test(val) || /--$/.test(val.trim()) || /#/.test(val) ||
      /union\s+select/i.test(val) ||
      /'\s*or\s*'1'\s*=\s*'1/i.test(val) ||
      /'\s*or\s+1\s*=\s*1/i.test(val)
    );
  }

  function pushRealAttack(q, succeeded) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      ts: Date.now(), type: "sqli_search", severity: "critical",
      ip: "REAL ATTACKER", port: 443, user: "anon",
      detail: succeeded
        ? \`✦ REAL ATTACK — SQLi SUCCEEDED in search: dumped results via "\${q}"\`
        : \`✦ REAL ATTACK — SQLi attempt blocked in search form: "\${q}"\`,
      endpoint: "/api/search", method: "GET",
      statusCode: succeeded ? 200 : 403,
      userAgent: navigator.userAgent.slice(0, 60),
      payload: \`query=\${q}\`, country: "LIVE", patched: !succeeded,
    };
    try {
      const existing = JSON.parse(localStorage.getItem("real_attack_log") || "[]");
      existing.unshift(entry);
      localStorage.setItem("real_attack_log", JSON.stringify(existing.slice(0, 50)));
    } catch {}
  }

  // 🔴 FIX THIS: when sqliFixed && isInjection, block before the fetch.
  const runSearch = async () => {
    if (!query.trim()) return;
    const isInjection = detectSqliPattern(query);

    // TODO: add blocking logic here when sqliFixed === true
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
      {sqliFixed && <div>SQL Injection — Patched: parameterized queries active on /api/search</div>}
      {attackBlocked && <div>Attack Blocked — payload <code>{lastAttack}</code> intercepted.</div>}
      <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} placeholder="Enter username or account ID..." />
      <button onClick={runSearch} disabled={loading}>{loading ? "..." : "Search"}</button>
      {searched && !attackBlocked && (
        <div>
          {results.length === 0
            ? <div dangerouslySetInnerHTML={{ __html: \`No users found matching "\${query}"\` }} />
            : results.map((u, i) => (
              <div key={i}>
                {/* 🔴 Stored XSS — username rendered via dangerouslySetInnerHTML */}
                <div dangerouslySetInnerHTML={{ __html: u.username || u[1] }} />
                <div>{u.email || u[2]}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}`;

// ── JWT — starter code ────────────────────────────────────────────────────────

export const JWT_AUTH_STARTER = `import jwt from 'jsonwebtoken';

// 🔴 FIX THIS: accepts ANY algorithm (including "none") and falls back to "secret"

export function getUserFromToken(token) {
  // Replace below with a secure jwt.verify() call (enforce algorithm, no weak fallback)
  return jwt.verify(token, process.env.JWT_SECRET || 'secret');
}

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
}`;

export const JWT_ROUTE_STARTER = `import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { getUserFromToken } from "../../../lib/auth";
import { logAttack, detectJwtForgery } from "../../../lib/logAttack";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const authHeader = req.headers.get("Authorization");
  let token = authHeader?.replace("Bearer ", "");
  if (!token) token = req.cookies.get("token")?.value;

  const decoded: any = getUserFromToken(token);
  const userId = decoded?.id;

  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();

    // 🔴 FIX THIS: raw interpolation allows SQL injection + IDOR
    const query = \`SELECT id, username, email, role, balance, account_number, created_at FROM users WHERE id=\${userId}\`;
    const [rows]: any = await db.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const dbUser = rows[0];

    // 🔴 FIX THIS: no ownership check — add one here before returning
    // 🔴 FIX THIS: remove stack trace from catch block

    return NextResponse.json({ success: true, user: dbUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, stack: err.stack }, { status: 500 });
  }
}`;

// ── Transactions GET route — starter code ─────────────────────────────────────

export const SQLI_TXN_ROUTE_STARTER = `import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 🔴 FIX THIS: userId taken directly from query param — no auth, no sanitization
  // IDOR:  /api/transactions?userId=2  → another user's history, no token needed
  // SQLi:  userId=1 OR 1=1            → all transactions across all users
  // SQLi:  userId=1 UNION SELECT id,username,email,password_hash,role,balance,account_number,created_at FROM users--
  const userId = searchParams.get("userId") || "1";

  try {
    const db = await getDb();
    const query = \`SELECT * FROM transactions WHERE user_id=\${userId} ORDER BY created_at DESC\`;
    const [rows]: any = await db.query(query);

    return NextResponse.json({
      success: true,
      transactions: rows,
      // 🔴 FIX THIS: raw query echoed back — leaks SQL to the client
      query,
      meta: { count: rows.length, userId },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
        stack: err.stack,                                   // 🔴 stack trace exposed
        query: \`SELECT * FROM transactions WHERE user_id=\${userId}\`,  // 🔴 raw query exposed
        hint: "Query execution failed — check your syntax",
      },
      { status: 500 },
    );
  }
}`;

// ── Transactions POST route — starter code ────────────────────────────────────

export const SQLI_TXN_INSERT_STARTER = `import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export async function POST(req: NextRequest) {
  // 🔴 FIX THIS: no auth check — anyone can record transactions for any user
  // 🔴 FIX THIS: values interpolated directly into INSERT — injectable
  // 🔴 FIX THIS: no amount validation — negative amounts create fake credits
  const { fromUserId, toAccount, amount, description } = await req.json();

  try {
    const db = await getDb();

    // Exploit: description = "pwned'),('2','99999','hacked','credit"
    // Exploit: amount = -99999 (negative credit)
    // Exploit: fromUserId = any other user's ID (no ownership check)
    const insertQuery = \`
      INSERT INTO transactions (user_id, amount, description, type)
      VALUES (\${fromUserId}, \${amount}, '\${description}', 'debit')
    \`;
    await db.query(insertQuery);

    return NextResponse.json({ success: true, message: "Transaction recorded" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}`;

// ── Transactions page — starter code ─────────────────────────────────────────

export const XSS_TXN_PAGE_STARTER = `// ✅ YOUR FIX — remove unsafe rendering from the transaction row

// The current vulnerable row renders:
//   1. JSON.stringify(t) directly in JSX when t.password_hash is present
//   2. t.description and t.amount without sanitization after a UNION dump
//
// Fix all three issues below:

{displayTxns.map((t, i) => (
  <div key={t.id || i}>
    <div>
      {/* 1. Render t.description safely — never use dangerouslySetInnerHTML */}
      {t.description}
    </div>
    <div>
      {/* 2. Never render t.password_hash, t.role, or any credential field */}
      {/* 3. Remove the JSON.stringify(t) raw dump entirely */}
      {/* Safe amount display: */}
      {isNaN(parseFloat(t.amount))
        ? null
        : Math.abs(parseFloat(t.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </div>
  </div>
))}`;
