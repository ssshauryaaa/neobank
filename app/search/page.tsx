"use client";

// ' OR '1'='1
// ' OR 1=1 --

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

// ── Shared patch state key (same key the defense console writes to) ──────────
const PATCH_KEY = "patched_sqli";

export default function SearchPage() {
  const { isDark } = useTheme();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
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

  // Detect SQLi patterns (mirrors login page detection)
  function detectSqliPattern(val: string): boolean {
    return (
      /'\s*(or|and)\s*'?\d/i.test(val) ||
      /--[\s]/.test(val) ||
      /--$/.test(val.trim()) ||
      /#/.test(val) ||
      /union\s+select/i.test(val) ||
      /;\s*(drop|alter|insert)/i.test(val) ||
      /'\s*or\s*'1'\s*=\s*'1/i.test(val) ||
      /'\s*--\s*/.test(val) ||
      /'\s*or\s+1\s*=\s*1/i.test(val) ||
      /'\s*or\s+'?1'?\s*=\s*'?1/i.test(val)
    );
  }

  // Push a real attack event so the defense console picks it up
  function pushRealAttack(q: string, succeeded: boolean) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      ts: Date.now(),
      type: "sqli",
      severity: "critical",
      ip: "REAL ATTACKER",
      port: 443,
      user: "anon",
      detail: succeeded
        ? `✦ REAL ATTACK — SQLi SUCCEEDED in search: dumped results via "${q}"`
        : `✦ REAL ATTACK — SQLi attempt blocked in search form: "${q}"`,
      endpoint: "/api/search",
      method: "GET",
      statusCode: succeeded ? 200 : 403,
      userAgent: navigator.userAgent.slice(0, 60),
      payload: `query=${q}`,
      country: "LIVE",
      patched: !succeeded,
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

  const runSearch = async () => {
    if (!query.trim()) return;

    const isInjection = detectSqliPattern(query);

    // If patch is active, block the exploit before it hits the server
    if (isInjection && sqliFixed) {
      setAttackBlocked(true);
      setLastAttack(query);
      setSearched(false);
      setResults([]);
      pushRealAttack(query, false);
      return;
    }

    setAttackBlocked(false);
    setLastAttack(null);

    if (isInjection) {
      pushRealAttack(query, false); // will update to success if it works
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.results || []);
        // If injection succeeded and returned more rows than expected
        if (isInjection && (data.results?.length ?? 0) > 0) {
          pushRealAttack(query, true);
        }
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }

    setLoading(false);
  };

  const theme = {
    bgMain: isDark ? "#000000" : "#F9F8F6",
    textMain: isDark ? "#EDEDED" : "#1A1A1A",
    textSub: isDark ? "#A1A1AA" : "#70685C",
    cardBg: isDark ? "#0A0A0A" : "white",
    borderMain: isDark ? "#27272A" : "#EDEAE4",
    btnBg: isDark ? "#EDEDED" : "#1A1A1A",
    btnText: isDark ? "#0A0A0A" : "white",
    debugBg: isDark ? "#111111" : "#F1EFE9",
    debugText: isDark ? "#71717A" : "#B8B2A7",
    resultHeaderBg: isDark ? "#111111" : "#F9F8F6",
    resultBorder: isDark ? "#27272A" : "#F5F3EF",
    avatarBg: isDark ? "#EDEDED" : "#1A1A1A",
    avatarText: isDark ? "#0A0A0A" : "white",
    sendBtnBg: isDark ? "#111111" : "#F9F8F6",
    sendBtnText: isDark ? "#EDEDED" : "#1A1A1A",
    leakText: isDark ? "#52525B" : "#D1CEC7",
  };

  const isCurrentlyInjection = detectSqliPattern(query);

  return (
    <div
      data-theme={isDark ? "dark" : "light"}
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme.bgMain,
        fontFamily: "Inter, sans-serif",
        color: theme.textMain,
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: "48px 64px",
          overflowY: "auto",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 8,
              color: theme.textMain,
            }}
          >
            Find People
          </h1>
          <p style={{ fontSize: 16, color: theme.textSub }}>
            Search for other Neobank users to send money instantly.
          </p>

          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: theme.debugText,
              fontFamily: "monospace",
              background: theme.debugBg,
              padding: "4px 10px",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            // DEBUG: RAW_QUERY_MODE_ENABLED
          </div>
        </header>

        {/* ── SQL Injection FIXED banner ── */}
        {sqliFixed && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 24,
              maxWidth: "700px",
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
              <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
                A defender deployed a hotfix. Parameterized queries are now
                active on this endpoint. Payloads like{" "}
                <code
                  style={{
                    background: "#dcfce7",
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                >
                  ' OR 1=1 --
                </code>{" "}
                are blocked.
              </div>
            </div>
          </div>
        )}

        {/* ── Attack BLOCKED banner ── */}
        {attackBlocked && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 24,
              maxWidth: "700px",
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
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
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
              <div style={{ fontSize: 12, color: "#9a3412", lineHeight: 1.5 }}>
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
                was intercepted. This search is protected by parameterized
                queries.
              </div>
            </div>
          </div>
        )}

        {/* Search Input Card */}
        <section
          style={{
            background: theme.cardBg,
            border: `1px solid ${isCurrentlyInjection && !sqliFixed ? "#fca5a5" : theme.borderMain}`,
            borderRadius: 24,
            padding: "32px",
            marginBottom: 32,
            maxWidth: "700px",
            boxShadow: isDark ? "none" : "0 4px 12px rgba(132, 125, 110, 0.04)",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setAttackBlocked(false);
                  setLastAttack(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Enter username or account ID..."
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  borderRadius: 16,
                  fontSize: 15,
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                  background:
                    isCurrentlyInjection && !sqliFixed
                      ? isDark
                        ? "#1a0a0a"
                        : "#fff5f5"
                      : undefined,
                  borderColor:
                    isCurrentlyInjection && !sqliFixed ? "#fca5a5" : undefined,
                }}
                className="search-input"
              />
              {/* Injection hint for red team */}
              {isCurrentlyInjection && !sqliFixed && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -20,
                    left: 4,
                    fontSize: 11,
                    color: "#ef4444",
                    fontFamily: "monospace",
                  }}
                >
                  ⚠ Injection pattern detected
                </div>
              )}
            </div>
            <button
              onClick={runSearch}
              disabled={loading}
              style={{
                padding: "0 28px",
                background: theme.btnBg,
                color: theme.btnText,
                border: "none",
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "transform 0.1s active",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "..." : "Search"}
            </button>
          </div>

          {/* Security status strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: isCurrentlyInjection && !sqliFixed ? 28 : 16,
              padding: "8px 12px",
              background: sqliFixed ? "#f0fdf4" : isDark ? "#111" : "#fafaf9",
              border: `1px solid ${sqliFixed ? "#bbf7d0" : isDark ? "#27272a" : "#e8e5df"}`,
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
                color: sqliFixed ? "#15803d" : isDark ? "#a16207" : "#92400e",
                fontFamily: "monospace",
              }}
            >
              {sqliFixed
                ? "SQL Injection: PATCHED (parameterized queries active)"
                : "SQL Injection: VULNERABLE (raw query interpolation active)"}
            </span>
          </div>
        </section>

        {/* Results */}
        {searched && !attackBlocked && (
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.borderMain}`,
              borderRadius: 24,
              overflow: "hidden",
              maxWidth: "700px",
              boxShadow: isDark
                ? "none"
                : "0 8px 24px rgba(132, 125, 110, 0.08)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: `1px solid ${theme.resultBorder}`,
                background: theme.resultHeaderBg,
              }}
            >
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#8A7F6E",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Search Results ({results.length})
              </h3>
            </div>

            {results.length === 0 ? (
              <div
                style={{
                  padding: "48px 32px",
                  textAlign: "center",
                  fontSize: 15,
                  color: theme.textSub,
                }}
                /* 🔥 Reflected XSS Point — intentionally left vulnerable */
                dangerouslySetInnerHTML={{
                  __html: `No users found matching "<strong>${query}</strong>"`,
                }}
              />
            ) : (
              results.map((u, i) => (
                <div
                  key={i}
                  style={{
                    padding: "20px 24px",
                    borderBottom:
                      i < results.length - 1
                        ? `1px solid ${theme.resultBorder}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background 0.2s",
                  }}
                  className="result-row"
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "14px",
                        background: theme.avatarBg,
                        color: theme.avatarText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {String(u.username || u[1] || "?")[0]?.toUpperCase()}
                    </div>

                    <div>
                      {/* 🔥 Stored XSS Point — intentionally left vulnerable */}
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          marginBottom: 2,
                          color: theme.textMain,
                        }}
                        dangerouslySetInnerHTML={{ __html: u.username || u[1] }}
                      />

                      <div style={{ fontSize: 13, color: theme.textSub }}>
                        {u.email || u[2]}
                      </div>

                      {/* Debug Leak */}
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          color: theme.leakText,
                          fontFamily: "monospace",
                          maxWidth: "250px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        RAW: {JSON.stringify(u)}
                      </div>
                    </div>
                  </div>

                  <a
                    href={`/transfer?to=${u.account_number || ""}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: theme.sendBtnText,
                      textDecoration: "none",
                      padding: "10px 18px",
                      background: theme.sendBtnBg,
                      border: `1px solid ${theme.borderMain}`,
                      borderRadius: 12,
                      transition: "all 0.2s",
                    }}
                    className="send-btn"
                  >
                    Send Money →
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        [data-theme="light"] .search-input {
          background: #f9f8f6;
          border: 1px solid #edeae4;
          color: #1a1a1a;
        }
        [data-theme="light"] .search-input:focus {
          border-color: #1a1a1a;
          background: white;
          box-shadow: 0 0 0 4px rgba(26, 26, 26, 0.05);
        }

        [data-theme="dark"] .search-input {
          background: #111111;
          border: 1px solid #27272a;
          color: #ededed;
        }
        [data-theme="dark"] .search-input:focus {
          border-color: #ededed;
          background: #000000;
          box-shadow: 0 0 0 4px rgba(237, 237, 237, 0.1);
        }

        .search-input::placeholder {
          color: #8a7f6e;
        }

        [data-theme="light"] .result-row:hover {
          background-color: #fafaf9;
        }
        [data-theme="dark"] .result-row:hover {
          background-color: #111111;
        }

        [data-theme="light"] .send-btn:hover {
          background-color: #1a1a1a;
          color: white !important;
          border-color: #1a1a1a;
        }
        [data-theme="dark"] .send-btn:hover {
          background-color: #ededed;
          color: #0a0a0a !important;
          border-color: #ededed;
        }
      `}</style>
    </div>
  );
}
