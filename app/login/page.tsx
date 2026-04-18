"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Shared patch state key (same key the defense console writes to) ──────────
// The defense console calls: localStorage.setItem('patched_sqli', '1')
// This page reads it to show the "fixed" banner and block the exploit.
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

  // Poll localStorage for patch status (set by the defense console)
  useEffect(() => {
    function check() {
      setSqliFixed(localStorage.getItem(PATCH_KEY) === "1");
    }
    check();
    const iv = setInterval(check, 800);
    return () => clearInterval(iv);
  }, []);

  // Detect SQLi patterns client-side (mirrors what the server detects)
  // MySQL requires "-- " (dash dash space) or "#" as a line comment.
  // So "admin'-- " works but "admin'--" (no trailing space) does not.
  // We match "--" followed by a space, end-of-string, or any whitespace.
  function detectSqliPattern(val: string): boolean {
    return (
      /'\s*(or|and)\s*'?\d/i.test(val) ||
      /--[\s]/.test(val) || // MySQL: -- requires trailing space
      /--$/.test(val.trim()) || // also catch -- at end after trim
      /#/.test(val) || // MySQL alternate comment char
      /union\s+select/i.test(val) ||
      /;\s*(drop|alter|insert)/i.test(val) ||
      /'\s*or\s*'1'\s*=\s*'1/i.test(val) ||
      /'\s*--\s*/.test(val)
    ); // any quote followed by -- and optional space
  }

  // ── Write a real attack event to localStorage so the defense console picks it up ──
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

    // If patch is active, block the exploit before it even hits the server
    if (isInjection && sqliFixed) {
      setLoading(false);
      setAttackBlocked(true);
      setLastAttack(username || password);
      setError("");
      pushRealAttack(username, username, false);
      return;
    }

    // Log the attempt immediately before the server call
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
        // If they got in via SQLi, update the log entry to show success
        if (isInjection) pushRealAttack(username, username, true);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        document.cookie = `session=${data.user.id}; path=/`;
        router.push("/dashboard");
      } else {
        // Show a subtle hint if it looks like a SQLi attempt that didn't work
        if (isInjection) {
          setError(
            "Invalid credentials. (Injection attempt logged to defense console.)",
          );
        } else {
          setError(data.message || "Invalid username or password.");
        }
      }
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  const s = {
    page: {
      minHeight: "100vh",
      background: "#f8f7f4",
      display: "flex",
      fontFamily: "Inter, sans-serif",
    } as any,
    left: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
    } as any,
    right: {
      width: 480,
      background: "#1a1a1a",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "64px 56px",
    } as any,
    form: { width: "100%", maxWidth: 400 } as any,
    label: {
      display: "block",
      fontSize: 13,
      fontWeight: 500,
      color: "#6b6355",
      marginBottom: 6,
    } as any,
    input: {
      width: "100%",
      padding: "12px 14px",
      border: "1px solid #d4d0c8",
      borderRadius: 8,
      fontSize: 14,
      background: "white",
      outline: "none",
      fontFamily: "Inter, sans-serif",
      boxSizing: "border-box",
    } as any,
    btn: {
      width: "100%",
      padding: "13px",
      borderRadius: 8,
      background: "#1a1a1a",
      color: "white",
      fontSize: 14,
      fontWeight: 600,
      border: "none",
      cursor: "pointer",
      letterSpacing: "-0.2px",
    } as any,
    inputWrapper: { position: "relative", width: "100%" } as any,
    toggleBtn: {
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      color: "#8a7f6e",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      outline: "none",
    } as any,
  };

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.form}>
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 48,
              textDecoration: "none",
              color: "#1a1a1a",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background: "#1a1a1a",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="9,22 9,12 15,12 15,22"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.4px" }}
            >
              neobank
            </span>
          </Link>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.8px",
              marginBottom: 6,
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: "#8a7f6e", marginBottom: 24 }}>
            Sign in to your account to continue.
          </p>

          {/* ── SQL Injection FIXED banner ── */}
          {sqliFixed && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: "#16a34a",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#15803d",
                    marginBottom: 3,
                  }}
                >
                  SQL Injection — Patched
                </div>
                <div
                  style={{ fontSize: 12, color: "#166534", lineHeight: 1.5 }}
                >
                  A defender deployed a hotfix. Parameterized queries are now
                  active. Injection payloads like{" "}
                  <code
                    style={{
                      background: "#dcfce7",
                      padding: "1px 5px",
                      borderRadius: 3,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    admin'--{" "}
                  </code>{" "}
                  (MySQL comment syntax) are blocked.
                </div>
              </div>
            </div>
          )}

          {/* ── Attack BLOCKED banner (shown when patched + injection attempted) ── */}
          {attackBlocked && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: "#ea580c",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <line
                    x1="4.93"
                    y1="4.93"
                    x2="19.07"
                    y2="19.07"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#c2410c",
                    marginBottom: 3,
                  }}
                >
                  Attack Blocked
                </div>
                <div
                  style={{ fontSize: 12, color: "#9a3412", lineHeight: 1.5 }}
                >
                  Payload{" "}
                  <code
                    style={{
                      background: "#ffedd5",
                      padding: "1px 5px",
                      borderRadius: 3,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    {lastAttack}
                  </code>{" "}
                  was intercepted. This login is protected by parameterized
                  queries.
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
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 13,
                color: "#dc2626",
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label style={s.label}>Username</label>
              <input
                style={{
                  ...s.input,
                  borderColor:
                    detectSqliPattern(username) && !sqliFixed
                      ? "#fca5a5"
                      : "#d4d0c8",
                  background:
                    detectSqliPattern(username) && !sqliFixed
                      ? "#fff5f5"
                      : "white",
                }}
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setAttackBlocked(false);
                }}
                required
              />
              {/* Subtle injection hint for red team */}
              {detectSqliPattern(username) && !sqliFixed && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#ef4444",
                    marginTop: 4,
                    fontFamily: "monospace",
                  }}
                >
                  ⚠ Injection pattern detected
                </div>
              )}
            </div>

            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label style={s.label}>Password</label>
                <a
                  href="#"
                  style={{
                    fontSize: 13,
                    color: "#8a7f6e",
                    textDecoration: "none",
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <div style={s.inputWrapper}>
                <input
                  style={{ ...s.input, paddingRight: 60 }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAttackBlocked(false);
                  }}
                  required
                />
                <button
                  type="button"
                  style={s.toggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Security status strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
              padding: "10px 12px",
              background: sqliFixed ? "#f0fdf4" : "#fafaf9",
              border: `1px solid ${sqliFixed ? "#bbf7d0" : "#e8e5df"}`,
              borderRadius: 8,
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
              marginTop: 20,
              fontSize: 14,
              color: "#8a7f6e",
            }}
          >
            Don't have an account?{" "}
            <Link
              href="/register"
              style={{
                color: "#1a1a1a",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open one free
            </Link>
          </p>
        </div>
      </div>

      {/* Right — brand panel */}
      <div style={s.right}>
        <div style={{ marginBottom: "auto", paddingBottom: 64 }}>
          <div
            style={{
              fontFamily: "DM Serif Display, serif",
              fontSize: 36,
              color: "white",
              lineHeight: 1.2,
              letterSpacing: "-1px",
              marginBottom: 24,
            }}
          >
            Your money,
            <br />
            <em>your control.</em>
          </div>
          <p
            style={{
              color: "#8a7f6e",
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 320,
            }}
          >
            Track balances, send transfers, and manage your finances from
            anywhere — all in one place.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { n: "2M+", label: "Active customers" },
            { n: "$14B", label: "Processed annually" },
            { n: "99.98%", label: "Platform uptime" },
          ].map((stat) => (
            <div
              key={stat.n}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #2e2e2e",
                paddingTop: 16,
              }}
            >
              <span style={{ color: "#8a7f6e", fontSize: 13 }}>
                {stat.label}
              </span>
              <span
                style={{
                  color: "white",
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: "-0.5px",
                }}
              >
                {stat.n}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
