"use client";
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
    return () => {
      clearInterval(iv);
      window.removeEventListener("storage", check);
    };
  }, []);

  function detectSqliPattern(val: string): boolean {
    return (
      /'\s*(or|and)\s*'?\d/i.test(val) || // ' OR '1 / ' OR 1
      /'\s*or\s+1\s*=\s*1/i.test(val) || // ' OR 1=1
      /'\s*or\s*'1'\s*=\s*'1/i.test(val) || // ' OR '1'='1
      /--[\s]/.test(val) || // -- (with space)
      /--$/.test(val.trim()) || // -- at end
      /'\s*--/.test(val) || // '-- anywhere
      /#/.test(val) || // MySQL # comment
      /union\s+select/i.test(val) || // UNION SELECT
      /;\s*(drop|alter|insert|select)/i.test(val) // stacked queries
    );
  }

  function pushRealAttack(
    username: string,
    payload: string,
    succeeded: boolean,
  ) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      ts: Date.now(),
      type: "sqli",
      severity: "critical",
      ip: "REAL ATTACKER",
      port: 443,
      user: username || "anon",
      detail: succeeded
        ? `✦ REAL ATTACK — Auth bypass SUCCEEDED via SQLi: "${username}" authenticated as admin`
        : `✦ REAL ATTACK — SQLi attempt detected in login form: "${username}"`,
      endpoint: "/api/login",
      method: "POST",
      statusCode: succeeded ? 200 : 401,
      userAgent: navigator.userAgent.slice(0, 60),
      payload: `username=${payload}&password=<redacted>`,
      country: "LIVE",
      patched: false,
      blocked: false,
      detected: false,
      restored: false,
    };
    try {
      const existing = JSON.parse(
        localStorage.getItem("real_attack_log") || "[]",
      );
      existing.unshift(entry);
      localStorage.setItem(
        "real_attack_log",
        JSON.stringify(existing.slice(0, 50)),
      );
    } catch {
      /* ignore */
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAttackBlocked(false);
    setLastAttack(null);

    const isInjection =
      detectSqliPattern(username) || detectSqliPattern(password);

    if (isInjection && sqliFixed) {
      setLoading(false);
      setAttackBlocked(true);
      setLastAttack(username || password);
      pushRealAttack(username, username, false);
      return;
    }

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
        document.cookie = `session=${data.user.id}; path=/`;
        router.push("/dashboard");
      } else {
        setError(
          isInjection
            ? "Invalid credentials. (Injection attempt logged to defense console.)"
            : data.message || "Invalid username or password.",
        );
      }
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  const usernameInjection = detectSqliPattern(username);
  const passwordInjection = detectSqliPattern(password);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; }

        .fade-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .login-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 15px;
          color: #111827;
          outline: none;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .login-input.normal {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .login-input.normal:focus {
          background: #ffffff;
          border-color: #111827;
          box-shadow: 0 0 0 4px rgba(17,24,39,0.08);
        }
        .login-input.danger {
          border: 1px solid #fca5a5;
          background: #fff5f5;
        }
        .login-input.danger:focus {
          background: #fff5f5;
          border-color: #ef4444;
          box-shadow: 0 0 0 4px rgba(239,68,68,0.1);
        }
        .login-input::placeholder { color: #9ca3af; }

        .login-btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          background: #111827;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          font-family: inherit;
        }
        .login-btn:hover:not(:disabled) {
          background: #1f2937;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .stat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0;
          border-top: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .stat-row:hover {
          border-top-color: rgba(255,255,255,0.25);
          transform: translateX(4px);
        }

        @media (max-width: 900px) {
          .right-panel { display: none !important; }
          .left-panel  { padding: 32px !important; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: "#ffffff",
        }}
      >
        {/* ── Left panel ── */}
        <div
          className="left-panel"
          style={{
            flex: "1 1 50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px",
          }}
        >
          <div className="fade-in" style={{ width: "100%", maxWidth: "420px" }}>
            {/* Logo */}
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "56px",
                textDecoration: "none",
                color: "#111827",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: "#111827",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="9,22 9,12 15,12 15,22"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: "-0.03em",
                }}
              >
                neobank.
              </span>
            </Link>

            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 32 }}>
              Sign in to your account to continue securely.
            </p>

            {/* ── Patched banner ── */}
            {sqliFixed && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    background: "#22c55e",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#166534",
                      marginBottom: 4,
                    }}
                  >
                    Protection Active
                  </div>
                  <div
                    style={{ fontSize: 13, color: "#15803d", lineHeight: 1.5 }}
                  >
                    Hotfix deployed. Parameterized queries are enforcing
                    security. Payloads like{" "}
                    <code
                      style={{
                        background: "rgba(34,197,94,0.15)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      admin'--
                    </code>{" "}
                    are safely neutralized.
                  </div>
                </div>
              </div>
            )}

            {/* ── Blocked banner ── */}
            {attackBlocked && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    background: "#ef4444",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#991b1b",
                      marginBottom: 4,
                    }}
                  >
                    Threat Intercepted
                  </div>
                  <div
                    style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.5 }}
                  >
                    Malicious payload{" "}
                    <code
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {lastAttack}
                    </code>{" "}
                    was blocked by parameterized queries.
                  </div>
                </div>
              </div>
            )}

            {/* ── Generic error ── */}
            {error && !attackBlocked && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 12,
                  padding: "14px 16px",
                  fontSize: 14,
                  color: "#b91c1c",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              {/* Username */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Username
                </label>
                <input
                  className={`login-input ${usernameInjection && !sqliFixed ? "danger" : "normal"}`}
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setAttackBlocked(false);
                    setError("");
                  }}
                  required
                />
                {usernameInjection && !sqliFixed && (
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 11,
                      color: "#ef4444",
                      fontFamily: "monospace",
                    }}
                  >
                    ⚠ Injection pattern detected
                  </div>
                )}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 32 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <label
                    style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}
                  >
                    Password
                  </label>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    className={`login-input ${passwordInjection && !sqliFixed ? "danger" : "normal"}`}
                    style={{ paddingRight: 70 }}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setAttackBlocked(false);
                      setError("");
                    }}
                    required
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#6b7280",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      padding: 4,
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {passwordInjection && !sqliFixed && (
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 11,
                      color: "#ef4444",
                      fontFamily: "monospace",
                    }}
                  >
                    ⚠ Injection pattern detected
                  </div>
                )}
              </div>

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg
                      style={{ animation: "spin 1s linear infinite" }}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="3"
                      />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* ── Security status strip ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 20,
                padding: "9px 12px",
                background: sqliFixed ? "#f0fdf4" : "#fafaf9",
                border: `1px solid ${sqliFixed ? "#bbf7d0" : "#e8e5df"}`,
                borderRadius: 8,
                transition: "all 0.3s",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: sqliFixed ? "#16a34a" : "#d97706",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: sqliFixed ? "#15803d" : "#92400e",
                  fontFamily: "monospace",
                }}
              >
                {sqliFixed
                  ? "SQL Injection: PATCHED (parameterized queries active)"
                  : "SQL Injection: VULNERABLE (string concatenation active)"}
              </span>
            </div>

            <p
              style={{
                textAlign: "center",
                marginTop: 24,
                fontSize: 14,
                color: "#6b7280",
              }}
            >
              Don't have an account?{" "}
              <Link
                href="/register"
                style={{
                  color: "#111827",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Create one for free
              </Link>
            </p>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div
          className="right-panel"
          style={{
            flex: "1 1 50%",
            background: "#09090b",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 80,
            color: "white",
          }}
        >
          {/* Ambient gradients */}
          <div
            style={{
              position: "absolute",
              top: "-20%",
              right: "-10%",
              width: 600,
              height: 600,
              background:
                "radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(0,0,0,0) 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-10%",
              left: "-20%",
              width: 500,
              height: 500,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <div
            className="fade-in"
            style={{
              position: "relative",
              zIndex: 1,
              marginTop: "auto",
              marginBottom: 64,
            }}
          >
            <h2
              style={{
                fontSize: 48,
                fontWeight: 600,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                marginBottom: 24,
              }}
            >
              Your money, <br />
              <span style={{ color: "#a1a1aa" }}>your control.</span>
            </h2>
            <p
              style={{
                color: "#a1a1aa",
                fontSize: 18,
                lineHeight: 1.6,
                maxWidth: 400,
                fontWeight: 400,
              }}
            >
              Track balances, send transfers, and manage your finances from
              anywhere — seamlessly integrated.
            </p>
          </div>

          <div
            className="fade-in"
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              animationDelay: "0.2s",
            }}
          >
            {[
              { n: "2M+", label: "Active global customers" },
              { n: "$14B", label: "Volume processed annually" },
              { n: "99.99%", label: "Platform uptime" },
            ].map((stat) => (
              <div key={stat.n} className="stat-row">
                <span
                  style={{ color: "#a1a1aa", fontSize: 15, fontWeight: 500 }}
                >
                  {stat.label}
                </span>
                <span
                  style={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: 22,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.n}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
