import type { Challenge } from "@/types";
import {
  SQLI_LOGIN_ROUTE_STARTER,
  SQLI_LOGIN_PAGE_STARTER,
  SQLI_SEARCH_ROUTE_STARTER,
  SQLI_SEARCH_PAGE_STARTER,
  JWT_AUTH_STARTER,
  JWT_ROUTE_STARTER,
  SQLI_TXN_ROUTE_STARTER,
  SQLI_TXN_INSERT_STARTER,
  XSS_TXN_PAGE_STARTER,
} from "@/challenges/starterCode";
import {
  validateSqliLoginRoute,
  validateSqliLoginPage,
  validateSqliSearchRoute,
  validateSqliSearchPage,
  validateJwtAuth,
  validateJwtRoute,
  validateXss,
  validateIdor,
  validateSqliTxnRoute,
  validateSqliTxnPage,
  validateSqliTxnInsert,
  validateXssTxn,
} from "@/challenges/validators";

export const CHALLENGES: Partial<Record<string, Challenge>> = {
  sqli_login: {
    kind: "two-file",
    title: "Fix SQL Injection — Login API route & login page",
    description:
      "The login API builds queries via string concatenation, letting attackers bypass auth with payloads like admin'-- or ' OR '1'='1'--. Fix the route to use parameterized queries, remove the stack trace leak, and add client-side blocking in the login page.",
    points: 120,
    attackLabel: "SQL Injection — Login",
    attackColor: "#b91c1c",
    attackBg: "#fff1f1",
    attackBorder: "#fca5a5",
    tabs: ["route", "page"],
    tabLabels: { route: "api/login/route.ts", page: "login/page.tsx" },
    startCodes: {
      route: SQLI_LOGIN_ROUTE_STARTER,
      page: SQLI_LOGIN_PAGE_STARTER,
    },
    hints: {
      route: [
        "Replace the template literal with a parameterized query using ? placeholders:",
        `const query = "SELECT * FROM users WHERE username=? AND password=?";\nconst [rows]: any = await db.query(query, [username, password]);`,
        "Also remove stack: err.stack from the catch block — never expose stack traces in production.",
      ],
      page: [
        "Inside handleLogin, right after computing isInjection, add an early return when the patch is active:",
        `if (sqliFixed && isInjection) {\n  setLoading(false);\n  setAttackBlocked(true);\n  setLastAttack(username || password);\n  pushRealAttack(username, username, false);\n  return;\n}`,
      ],
    },
    validate: { route: validateSqliLoginRoute, page: validateSqliLoginPage },
    diffVulnLines: {
      route:
        /`SELECT \* FROM users|WHERE username='\$\{|AND password='\$\{|stack:\s*err\.stack/,
      page: /sqliFixed|attackBlocked/,
    },
    fixLines: {
      route: [
        '    const query = "SELECT * FROM users WHERE username=? AND password=?";',
        "    const [rows]: any = await db.query(query, [username, password]);",
        "",
        "    // Error handler — no stack leak:",
        "    return NextResponse.json({ success: false, message: err.message }, { status: 500 });",
      ],
      page: [
        "    if (sqliFixed && isInjection) {",
        "      setLoading(false);",
        "      setAttackBlocked(true);",
        "      setLastAttack(username || password);",
        "      pushRealAttack(username, username, false);",
        "      return;",
        "    }",
      ],
    },
  },

  sqli_search: {
    kind: "two-file",
    title: "Fix SQL Injection — Search API route & search page",
    description:
      "The /api/search endpoint builds queries with raw string interpolation, allowing UNION-based data exfiltration. Fix the route to use parameterized LIKE queries, remove the stack trace leak, and add client-side blocking on the search page.",
    points: 130,
    attackLabel: "SQL Injection — Search",
    attackColor: "#be185d",
    attackBg: "#fdf2f8",
    attackBorder: "#f9a8d4",
    tabs: ["route", "page"],
    tabLabels: { route: "api/search/route.ts", page: "search/page.tsx" },
    startCodes: {
      route: SQLI_SEARCH_ROUTE_STARTER,
      page: SQLI_SEARCH_PAGE_STARTER,
    },
    hints: {
      route: [
        "Replace the template literal with a parameterized LIKE query:",
        `const [result]: any = await db.query(\n  "SELECT id, username, email, role, balance, account_number FROM users WHERE username LIKE ?",\n  [\`%\${query}%\`]\n);`,
        "Also remove stack: err.stack from the catch block.",
      ],
      page: [
        "Inside runSearch(), add a guard right after computing isInjection:",
        `if (sqliFixed && isInjection) {\n  setAttackBlocked(true);\n  setLastAttack(query);\n  setSearched(false);\n  setResults([]);\n  pushRealAttack(query, false);\n  return;\n}`,
      ],
    },
    validate: { route: validateSqliSearchRoute, page: validateSqliSearchPage },
    diffVulnLines: {
      route: /LIKE\s*'%\$\{|`[^`]*\$\{query\}[^`]*`|stack:\s*err\.stack/,
      page: /sqliFixed|attackBlocked/,
    },
    fixLines: {
      route: [
        "    // ✅ FIXED — parameterized LIKE query",
        "    const [result]: any = await db.query(",
        '      "SELECT id, username, email, role, balance, account_number FROM users WHERE username LIKE ?",',
        "      [`%${query}%`]",
        "    );",
        "    // Error handler — no stack leak:",
        "    return NextResponse.json({ success: false, message: err.message }, { status: 500 });",
      ],
      page: [
        "    if (sqliFixed && isInjection) {",
        "      setAttackBlocked(true);",
        "      setLastAttack(query);",
        "      setSearched(false);",
        "      setResults([]);",
        "      pushRealAttack(query, false);",
        "      return;",
        "    }",
      ],
    },
  },

  jwt_forge: {
    kind: "two-file",
    title: "Fix JWT Forgery — auth library & user API route",
    description:
      'The auth library accepts any algorithm (including "none") and falls back to the hardcoded secret "secret". The /api/user route also has raw SQL interpolation and no IDOR ownership check. Fix both files.',
    points: 140,
    attackLabel: "JWT Forgery",
    attackColor: "#7c3aed",
    attackBg: "#f5f3ff",
    attackBorder: "#c4b5fd",
    tabs: ["auth", "route"],
    tabLabels: { auth: "lib/auth.ts", route: "api/user/route.ts" },
    startCodes: { auth: JWT_AUTH_STARTER, route: JWT_ROUTE_STARTER },
    hints: {
      auth: [
        "Pass an options object to jwt.verify() that locks the allowed algorithm:",
        `export function getUserFromToken(token) {\n  return jwt.verify(token, process.env.JWT_SECRET!, {\n    algorithms: ["HS256"],\n  });\n}`,
        'Also fix signToken() — remove the || "secret" fallback. Use process.env.JWT_SECRET!',
      ],
      route: [
        "Replace the template literal with a parameterized query:",
        `const query = "SELECT id, username, email, role, balance, account_number, created_at FROM users WHERE id = ?";\nconst [rows]: any = await db.query(query, [userId]);`,
        "After fetching dbUser, add an ownership check and remove the stack trace leak:",
        `if (!dbUser || String(dbUser.id) !== String(decoded.id)) {\n  return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });\n}\n// In the catch block, remove: stack: err.stack`,
      ],
    },
    validate: { auth: validateJwtAuth, route: validateJwtRoute },
    diffVulnLines: {
      auth: /jwt\.verify\s*\(|process\.env\.JWT_SECRET\s*\|\|/,
      route: /WHERE id=\$\{|`[^`]*\$\{userId\}|stack:\s*err\.stack/,
    },
    fixLines: {
      auth: [
        "export function getUserFromToken(token) {",
        "  return jwt.verify(token, process.env.JWT_SECRET!, {",
        '    algorithms: ["HS256"],',
        "  });",
        "}",
        "export function signToken(payload) {",
        "  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });",
        "}",
      ],
      route: [
        '    const query = "SELECT id, username, email, role, balance, account_number, created_at FROM users WHERE id = ?";',
        "    const [rows]: any = await db.query(query, [userId]);",
        "    if (!dbUser || String(dbUser.id) !== String(decoded.id)) {",
        '      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });',
        "    }",
        "    // In catch: remove stack: err.stack",
      ],
    },
  },

  xss: {
    kind: "single",
    title: "Fix: Stored XSS via dangerouslySetInnerHTML",
    description:
      "The transfer page renders user data via dangerouslySetInnerHTML, allowing script injection. Replace with safe React text rendering.",
    points: 100,
    starterCode: `// ✅ YOUR FIX — use safe React text rendering
<div>
  Transfer to <b>{lastTransfer.toAccount}</b> completed.
  {/* Render lastTransfer.note safely here */}
</div>
<div>
  {/* Render u.username safely */}
</div>`,
    hints: [
      "Remove dangerouslySetInnerHTML entirely — it is almost never the right tool.",
      "React automatically escapes text when you write it as a JSX expression: {value}",
      `Replace the dangerous divs with:\n<div>\n  Transfer to <b>{lastTransfer.toAccount}</b> completed.\n  Note: {lastTransfer.note}\n</div>\n<div>{u.username}</div>`,
    ],
    validate: validateXss,
  },

  idor: {
    kind: "single",
    title: "Fix: IDOR in User Data Endpoint",
    description:
      "The /api/user route returns any user whose ID appears in the JWT without ownership verification. Add server-side checks and parameterize the query.",
    points: 110,
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
    hints: [
      "Use a parameterized query: db.query('SELECT * FROM users WHERE id = ?', [decoded.id])",
      "After fetching the user, compare user.id to decoded.id — they must match.",
      `Add an ownership check:\nif (!user || user.id !== decoded.id) {\n  return NextResponse.json(\n    { success: false, message: 'Forbidden' },\n    { status: 403 }\n  );\n}`,
    ],
    validate: validateIdor,
  },

  // ── Transactions GET ──────────────────────────────────────────────────────────

  sqli_txn: {
    kind: "two-file",
    title: "Fix SQLi + IDOR — Transactions API route & lookup panel",
    description:
      "The /api/transactions GET route takes userId directly from the query string with no auth check and no sanitization, enabling both IDOR (fetch any user's history) and full UNION-based data exfiltration. It also echoes the raw SQL query and full stack trace back to the client. Fix the route and disable the unauthenticated lookup panel on the page.",
    points: 150,
    attackLabel: "SQLi + IDOR — Transactions",
    attackColor: "#9a3412",
    attackBg: "#fff7ed",
    attackBorder: "#fb923c",
    tabs: ["route", "page"],
    tabLabels: {
      route: "api/transactions/route.ts (GET)",
      page: "transactions/page.tsx",
    },
    startCodes: { route: SQLI_TXN_ROUTE_STARTER, page: XSS_TXN_PAGE_STARTER },
    hints: {
      route: [
        "Step 1 — verify the token and extract the authenticated user ID:",
        `const authHeader = req.headers.get("Authorization");\nconst token = authHeader?.replace("Bearer ", "");\nconst decoded: any = getUserFromToken(token);\nif (!decoded?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });`,
        "Step 2 — use the token's ID, not the query param, and parameterize:",
        `const [rows]: any = await db.query(\n  "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC",\n  [decoded.id]\n);`,
        "Step 3 — remove query, stack, and hint from both success and error responses.",
      ],
      page: [
        "The manual userId lookup panel is the IDOR entry point — remove it entirely, or at minimum disable it when the patch is active:",
        `// Remove the lookup panel <div> block, or gate it:\nif (txnPatched) return null; // don't render the lookup input`,
      ],
    },
    validate: { route: validateSqliTxnRoute, page: validateSqliTxnPage },
    diffVulnLines: {
      route:
        /userId\s*=\s*searchParams\.get|WHERE user_id=\$\{|`[^`]*\$\{userId\}|stack:\s*err\.stack|query,/,
      page: /manualUserId|runLookup|userId=\$\{encodeURIComponent/,
    },
    fixLines: {
      route: [
        "  const decoded: any = getUserFromToken(token);",
        '  if (!decoded?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });',
        "  const [rows]: any = await db.query(",
        '    "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC",',
        "    [decoded.id]",
        "  );",
        "  // Remove query, stack, hint from responses",
      ],
      page: [
        "  // Remove the manual userId lookup panel entirely",
        "  // or wrap it in: {!txnPatched && ( ... lookup panel ... )}",
      ],
    },
  },

  // ── Transactions POST (INSERT) ────────────────────────────────────────────────

  sqli_txn_insert: {
    kind: "single",
    title: "Fix SQLi — Transactions INSERT (POST /api/transactions)",
    description:
      "The POST handler interpolates fromUserId, amount, and description directly into an INSERT statement with no auth check and no amount validation. An attacker can forge transactions for any user, inject SQL via description, or credit themselves arbitrary amounts using negative values.",
    points: 140,
    starterCode: SQLI_TXN_INSERT_STARTER,
    hints: [
      "Step 1 — verify the token and confirm fromUserId matches the authenticated user:",
      `const token = req.headers.get("Authorization")?.replace("Bearer ", "");\nconst decoded: any = getUserFromToken(token);\nif (!decoded?.id || String(decoded.id) !== String(fromUserId)) {\n  return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });\n}`,
      "Step 2 — validate amount is a positive finite number:",
      `const parsedAmount = parseFloat(amount);\nif (isNaN(parsedAmount) || parsedAmount <= 0) {\n  return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });\n}`,
      "Step 3 — parameterize the INSERT with ? placeholders:",
      `const insertQuery = "INSERT INTO transactions (user_id, amount, description, type) VALUES (?, ?, ?, 'debit')";\nawait db.query(insertQuery, [fromUserId, parsedAmount, description]);`,
    ],
    validate: validateSqliTxnInsert,
  },

  // ── Transactions XSS ─────────────────────────────────────────────────────────

  xss_txn: {
    kind: "single",
    title: "Fix XSS — Transactions page unsafe rendering",
    description:
      "The transactions page renders t.password_hash and a raw JSON.stringify(t) dump directly in JSX when a UNION-based SQLi payload returns extra columns. Any stored XSS payload in a transaction description also executes. Remove the raw dump, never render credential fields, and ensure all text values are rendered as safe JSX nodes.",
    points: 120,
    starterCode: XSS_TXN_PAGE_STARTER,
    hints: [
      "Remove the conditional block that renders JSON.stringify(t) — it should never be displayed to users.",
      "Never check for or render t.password_hash, t.role, or any credential column — if the API leaks them, the UI must not display them.",
      `Safe pattern — render only known, expected fields:\n{t.description && <div>{t.description}</div>}\n{t.amount && <div>{Math.abs(parseFloat(t.amount)).toLocaleString()}</div>}`,
      "If you want to show a debug dump in development, gate it with process.env.NODE_ENV === 'development' and never in production.",
    ],
    validate: validateXssTxn,
  },
};
