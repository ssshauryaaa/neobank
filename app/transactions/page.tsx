"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

const Badge = ({
  type,
  isDark,
}: {
  type: "credit" | "debit";
  isDark: boolean;
}) => (
  <span
    style={{
      fontSize: "10px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      padding: "2px 8px",
      borderRadius: "12px",
      backgroundColor:
        type === "credit"
          ? isDark
            ? "rgba(34, 197, 94, 0.1)"
            : "#DCFCE7"
          : isDark
            ? "rgba(239, 68, 68, 0.1)"
            : "#FEE2E2",
      color:
        type === "credit"
          ? isDark
            ? "#4ADE80"
            : "#166534"
          : isDark
            ? "#F87171"
            : "#991B1B",
    }}
  >
    {type === "credit" ? "Received" : "Sent"}
  </span>
);

export default function TransactionsPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const [manualUserId, setManualUserId] = useState("");
  const [lookupResult, setLookupResult] = useState<any[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [rawQuery, setRawQuery] = useState<string | null>(null);

  // ── XSS patch + banner state ──────────────────────────────────────────────
  const [xssTxnPatched, setXssTxnPatched] = useState(false);
  const [xssAttackDetected, setXssAttackDetected] = useState(false);
  const [lastXssPayload, setLastXssPayload] = useState<string | null>(null);
  // Tracks which description ids we've already logged so we don't spam
  const loggedPayloads = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    const check = () =>
      setXssTxnPatched(localStorage.getItem("patched_xss_txn") === "1");
    check();
    window.addEventListener("storage", check);
    const iv = setInterval(check, 800);
    return () => {
      clearInterval(iv);
      window.removeEventListener("storage", check);
    };
  }, []);

  // ── Attack logging ────────────────────────────────────────────────────────

  function pushRealXssAttack(
    payload: string,
    context: "description" | "lookup",
    patched: boolean,
  ) {
    const contextLabel =
      context === "description"
        ? "transaction note / description field"
        : "transactions lookup panel";

    const detail = patched
      ? `✦ REAL ATTACK (BLOCKED) — XSS payload in ${contextLabel}: "${payload.slice(0, 120)}" — dangerouslySetInnerHTML removed, payload rendered as inert text`
      : `✦ REAL ATTACK — Stored XSS executed in ${contextLabel}: "${payload.slice(0, 120)}" — onerror handler ran in browser`;

    const entry = {
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      ts: Date.now(),
      type: "xss_txn",
      severity: "high",
      ip: "REAL ATTACKER",
      port: 443,
      user: "authenticated user",
      detail,
      endpoint: "/transactions (description render)",
      method: "GET",
      statusCode: 200,
      userAgent: navigator.userAgent.slice(0, 80),
      payload: `description=${payload}`,
      country: "LIVE",
      patched,
      detected: false,
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

  function pushRealTxnSqliAttack(userId: string, succeeded: boolean) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      ts: Date.now(),
      type: "sqli_txn",
      severity: "critical",
      ip: "REAL ATTACKER",
      port: 443,
      user: "anon",
      detail: succeeded
        ? `✦ REAL ATTACK — IDOR/SQLi SUCCEEDED on /api/transactions: userId="${userId}" returned data`
        : `✦ REAL ATTACK — SQLi attempt on /api/transactions: userId="${userId}"`,
      endpoint: "/api/transactions",
      method: "GET",
      statusCode: succeeded ? 200 : 400,
      userAgent: navigator.userAgent.slice(0, 60),
      payload: `userId=${userId}`,
      country: "LIVE",
      patched: false,
      detected: false,
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

  // ── Detection helpers ─────────────────────────────────────────────────────

  function detectXssPayload(val: string): boolean {
    return (
      /<script[\s>]/i.test(val) ||
      /javascript:/i.test(val) ||
      /on\w+\s*=/i.test(val) ||
      /<img[^>]+src\s*=\s*['"x]/i.test(val) ||
      /<iframe/i.test(val) ||
      /document\.cookie/i.test(val) ||
      /fetch\s*\(/i.test(val) ||
      /alert\s*\(/i.test(val)
    );
  }

  function detectSqliInUserId(val: string): boolean {
    return (
      /'\s*(or|and)\s*/i.test(val) ||
      /--[\s$]/.test(val) ||
      /union\s+select/i.test(val) ||
      /;\s*(drop|alter|insert|select)/i.test(val) ||
      /1\s*=\s*1/i.test(val)
    );
  }

  const theme = {
    bgMain: isDark ? "#000000" : "#F9F8F6",
    textMain: isDark ? "#EDEDED" : "#1A1A1A",
    textSub: isDark ? "#A1A1AA" : "#8A7F6E",
    borderMain: isDark ? "#27272A" : "#EDEAE4",
    borderSub: isDark ? "#1A1A1A" : "#F5F3EF",
    cardBg: isDark ? "#0A0A0A" : "white",
    filterContainerBg: isDark ? "#111111" : "#EEEBE5",
    filterActiveBg: isDark ? "#27272A" : "white",
    creditBg: isDark ? "rgba(34, 197, 94, 0.1)" : "#F0FDF4",
    creditText: isDark ? "#4ADE80" : "#166534",
    debitBg: isDark ? "rgba(239, 68, 68, 0.1)" : "#FFF1F2",
    debitText: isDark ? "#F87171" : "#991B1B",
    debugBg: isDark ? "#111111" : "#F1EFE9",
    debugText: isDark ? "#52525B" : "#B8B2A7",
  };

  const fetchTransactions = async () => {
    const token =
      localStorage.getItem("forgedToken") || localStorage.getItem("token");
    const user = JSON.parse(
      localStorage.getItem("forgedUser") ||
        localStorage.getItem("user") ||
        "{}",
    );
    if (!token || !user.id) return;
    try {
      const response = await fetch(`/api/transactions?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setTxns(data.transactions || []);
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token =
      localStorage.getItem("forgedToken") || localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("/api/user", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((userData) => {
        if (userData.success) {
          localStorage.setItem("user", JSON.stringify(userData.user));
          fetchTransactions();
        }
      });
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const runLookup = async () => {
    if (!manualUserId.trim()) return;
    const isSqli = detectSqliInUserId(manualUserId);
    const isXss = detectXssPayload(manualUserId);
    if (isSqli) pushRealTxnSqliAttack(manualUserId, false);
    if (isXss) pushRealXssAttack(manualUserId, "lookup", xssTxnPatched);
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError(null);
    setRawQuery(null);
    const token =
      localStorage.getItem("forgedToken") || localStorage.getItem("token");
    try {
      const res = await fetch(
        `/api/transactions?userId=${encodeURIComponent(manualUserId)}`,
        { headers: { Authorization: `Bearer ${token || ""}` } },
      );
      const data = await res.json();
      if (data.success) {
        setLookupResult(data.transactions || []);
        if (isSqli && (data.transactions?.length ?? 0) > 0)
          pushRealTxnSqliAttack(manualUserId, true);
        if (data.query) setRawQuery(data.query);
      } else {
        setLookupError(data.message || "Unknown error");
        if (data.query) setRawQuery(data.query);
        if (data.stack) console.error("[SERVER STACK]", data.stack);
      }
    } catch {
      setLookupError("Request failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const filteredTxns = useMemo(
    () => (filter === "all" ? txns : txns.filter((t) => t.type === filter)),
    [filter, txns],
  );

  const displayTxns = lookupResult !== null ? lookupResult : filteredTxns;
  const isLookupMode = lookupResult !== null;

  // ── Side-effect: scan txns for XSS payloads and write to real_attack_log ──
  // This runs whenever the displayed transactions change (new fetch, lookup, etc.)
  // It's the primary bridge between "user stored an XSS payload" and the defense
  // page log feed. We deduplicate by payload string so it only fires once per
  // unique payload per page session.
  useEffect(() => {
    displayTxns.forEach((t) => {
      const descStr = String(t.description ?? "");
      if (!descStr || !detectXssPayload(descStr)) return;
      if (loggedPayloads.has(descStr)) return; // already logged this payload
      loggedPayloads.add(descStr);

      // Write to real_attack_log (defense page polls this)
      pushRealXssAttack(descStr, "description", xssTxnPatched);

      // Show banner on transactions page
      setLastXssPayload(descStr);
      setXssAttackDetected(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTxns, xssTxnPatched]);

  return (
    <div
      data-theme={isDark ? "dark" : "light"}
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme.bgMain,
        color: theme.textMain,
        fontFamily: "Inter, sans-serif",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: "48px 64px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header
          style={{
            marginBottom: 40,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 8,
                color: theme.textMain,
              }}
            >
              Transactions
            </h1>
            <p style={{ fontSize: 16, color: theme.textSub }}>
              View and manage your recent activity.
            </p>

            {/* Debug hint bait */}
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: theme.debugText,
                fontFamily: "monospace",
                background: theme.debugBg,
                padding: "4px 10px",
                borderRadius: 6,
                display: "inline-block",
              }}
            >
              // DEBUG: userId param passed directly to query — no sanitization
            </div>

            {/* ── XSS Protection Active (patched) ─────────────────────────── */}
            {xssTxnPatched && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
                  border: `1px solid ${isDark ? "rgba(74,222,128,0.2)" : "#bbf7d0"}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  maxWidth: 560,
                  animation: "fadeIn 0.4s ease",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: "#22c55e",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
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
                      fontSize: 13,
                      fontWeight: 700,
                      color: isDark ? "#4ade80" : "#166534",
                      marginBottom: 3,
                    }}
                  >
                    XSS Protection Active
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: isDark ? "#86efac" : "#15803d",
                      lineHeight: 1.6,
                    }}
                  >
                    Hotfix deployed.{" "}
                    <code
                      style={{
                        background: isDark
                          ? "rgba(74,222,128,0.12)"
                          : "rgba(34,197,94,0.12)",
                        padding: "1px 5px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                    >
                      dangerouslySetInnerHTML
                    </code>{" "}
                    removed. Payloads like{" "}
                    <code
                      style={{
                        background: isDark
                          ? "rgba(74,222,128,0.12)"
                          : "rgba(34,197,94,0.12)",
                        padding: "1px 5px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                    >
                      &lt;img src=x onerror=...&gt;
                    </code>{" "}
                    are safely neutralized as plain text.
                  </div>
                </div>
              </div>
            )}

            {/* ── XSS Attack Detected — shown when unpatched & payload present ── */}
            {xssAttackDetected && !xssTxnPatched && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
                  border: `1px solid ${isDark ? "rgba(239,68,68,0.25)" : "#fecaca"}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  maxWidth: 560,
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: "#ef4444",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
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
                      fontSize: 13,
                      fontWeight: 700,
                      color: isDark ? "#f87171" : "#991b1b",
                      marginBottom: 3,
                    }}
                  >
                    XSS Attack Detected
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: isDark ? "#fca5a5" : "#b91c1c",
                      lineHeight: 1.6,
                    }}
                  >
                    Malicious payload{" "}
                    <code
                      style={{
                        background: isDark
                          ? "rgba(239,68,68,0.12)"
                          : "rgba(239,68,68,0.08)",
                        padding: "1px 5px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {lastXssPayload?.slice(0, 80)}
                    </code>{" "}
                    was found in a transaction note and{" "}
                    <strong>executed in your browser</strong>. Logged to the
                    defense console. Deploy a hotfix to block this.
                  </div>
                </div>
              </div>
            )}

            {/* ── Threat Intercepted — shown when patched & payload present ── */}
            {xssAttackDetected && xssTxnPatched && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  background: isDark ? "rgba(245,158,11,0.08)" : "#fffbeb",
                  border: `1px solid ${isDark ? "rgba(245,158,11,0.2)" : "#fde68a"}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  maxWidth: 560,
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: "#f59e0b",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
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
                      fontSize: 13,
                      fontWeight: 700,
                      color: isDark ? "#fbbf24" : "#92400e",
                      marginBottom: 3,
                    }}
                  >
                    Threat Intercepted
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: isDark ? "#fde68a" : "#a16207",
                      lineHeight: 1.6,
                    }}
                  >
                    Payload{" "}
                    <code
                      style={{
                        background: isDark
                          ? "rgba(245,158,11,0.12)"
                          : "rgba(245,158,11,0.1)",
                        padding: "1px 5px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {lastXssPayload?.slice(0, 80)}
                    </code>{" "}
                    was rendered as inert text — no script executed.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              background: theme.filterContainerBg,
              padding: 4,
              borderRadius: 10,
              gap: 4,
            }}
          >
            {(["all", "credit", "debit"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setLookupResult(null);
                  setLookupError(null);
                  setRawQuery(null);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background:
                    filter === f && !isLookupMode
                      ? theme.filterActiveBg
                      : "transparent",
                  color:
                    filter === f && !isLookupMode
                      ? theme.textMain
                      : theme.textSub,
                  boxShadow:
                    filter === f && !isLookupMode && !isDark
                      ? "0 2px 4px rgba(0,0,0,0.05)"
                      : "none",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* ── userId lookup panel ───────────────────────────────────────────── */}
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${lookupError ? "#fca5a5" : isLookupMode ? "#fdba74" : theme.borderMain}`,
            borderRadius: 16,
            padding: "20px 24px",
            marginBottom: 24,
            transition: "border-color 0.2s",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: theme.textSub,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Account Transaction Lookup
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={manualUserId}
              onChange={(e) => setManualUserId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runLookup()}
              placeholder="Enter user ID (e.g. 1, 2, 3…)"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontFamily: "monospace",
                background: isDark ? "#111111" : "#f9f8f6",
                border: `1px solid ${theme.borderMain}`,
                color: theme.textMain,
                outline: "none",
              }}
            />
            <button
              onClick={runLookup}
              disabled={lookupLoading}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                background: isDark ? "#EDEDED" : "#1A1A1A",
                color: isDark ? "#000" : "#fff",
                border: "none",
                cursor: lookupLoading ? "not-allowed" : "pointer",
                opacity: lookupLoading ? 0.6 : 1,
              }}
            >
              {lookupLoading ? "..." : "Fetch"}
            </button>
            {isLookupMode && (
              <button
                onClick={() => {
                  setLookupResult(null);
                  setLookupError(null);
                  setRawQuery(null);
                  setManualUserId("");
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "transparent",
                  border: `1px solid ${theme.borderMain}`,
                  color: theme.textSub,
                  cursor: "pointer",
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
          {rawQuery && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: isDark ? "#0a0a0a" : "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 11,
                color: "#dc2626",
                wordBreak: "break-all",
                lineHeight: 1.6,
              }}
            >
              <span style={{ fontWeight: 700, letterSpacing: "0.06em" }}>
                RAW QUERY:{" "}
              </span>
              {rawQuery}
            </div>
          )}
          {lookupError && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: isDark ? "#0a0a0a" : "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 11,
                color: "#dc2626",
              }}
            >
              <span style={{ fontWeight: 700 }}>ERROR: </span>
              {lookupError}
            </div>
          )}
          {isLookupMode && !lookupError && (
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "#d97706",
                fontFamily: "monospace",
              }}
            >
              ⚠ Showing {lookupResult!.length} transaction(s) for userId=
              <strong>{manualUserId}</strong> — no ownership check performed
            </div>
          )}
        </div>

        {/* ── Transaction list ──────────────────────────────────────────────── */}
        <div
          style={{
            background: theme.cardBg,
            borderRadius: 20,
            boxShadow: isDark
              ? "none"
              : "0 1px 3px rgba(0,0,0,0.02), 0 8px 24px rgba(132,125,110,0.08)",
            border: `1px solid ${isLookupMode ? "#fdba74" : theme.borderMain}`,
            overflow: "hidden",
            transition: "border-color 0.2s",
          }}
        >
          {isLookupMode && (
            <div
              style={{
                padding: "12px 24px",
                background: isDark ? "rgba(217,119,6,0.08)" : "#fffbeb",
                borderBottom: `1px solid #fde68a`,
                fontSize: 12,
                fontWeight: 600,
                color: "#92400e",
                fontFamily: "monospace",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>⚠</span>
              IDOR — Viewing transactions for userId={manualUserId} (not your
              account)
            </div>
          )}

          {loading && !isLookupMode ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div
                className="spinner"
                style={{
                  border: `3px solid ${theme.borderMain}`,
                  borderTop: `3px solid ${theme.textMain}`,
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  margin: "0 auto 16px",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ color: theme.textSub, fontSize: 14 }}>
                Updating ledger...
              </p>
            </div>
          ) : displayTxns.length === 0 ? (
            <div style={{ padding: "80px 40px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🍃</div>
              <p
                style={{ color: theme.textSub, fontSize: 15, fontWeight: 500 }}
              >
                {isLookupMode
                  ? `No transactions found for userId=${manualUserId}`
                  : "No transactions found for this period."}
              </p>
            </div>
          ) : (
            <div>
              {displayTxns.map((t, i) => {
                const descStr = String(t.description ?? "");
                const hasXss = !!descStr && detectXssPayload(descStr);

                return (
                  <div
                    key={t.id || i}
                    className="txn-row"
                    style={{
                      padding: "20px 32px",
                      borderBottom:
                        i < displayTxns.length - 1
                          ? `1px solid ${theme.borderSub}`
                          : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 20 }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background:
                            t.type === "credit"
                              ? theme.creditBg
                              : theme.debitBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          color:
                            t.type === "credit"
                              ? theme.creditText
                              : theme.debitText,
                        }}
                      >
                        {t.type === "credit" ? "＋" : "－"}
                      </div>

                      <div>
                        {/* ── Description rendering ──────────────────────────────────────
                         *  VULNERABLE (unpatched): dangerouslySetInnerHTML fires onerror
                         *  PATCHED:                plain JSX text node, React auto-escapes
                         *
                         *  Detection/logging is handled by the useEffect above that scans
                         *  displayTxns — NOT here in render, to avoid setState-in-render.
                         * ─────────────────────────────────────────────────────────────── */}
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: theme.textMain,
                            marginBottom: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {hasXss ? (
                            xssTxnPatched ? (
                              // PATCHED — safe text node
                              <>
                                <span>{descStr}</span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    padding: "2px 7px",
                                    borderRadius: 10,
                                    background: isDark
                                      ? "rgba(74,222,128,0.1)"
                                      : "#dcfce7",
                                    color: isDark ? "#4ade80" : "#166534",
                                    fontFamily: "monospace",
                                    flexShrink: 0,
                                  }}
                                >
                                  ✓ XSS blocked
                                </span>
                              </>
                            ) : (
                              // VULNERABLE — dangerouslySetInnerHTML lets onerror fire
                              <>
                                <span
                                  dangerouslySetInnerHTML={{ __html: descStr }}
                                />
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    padding: "2px 7px",
                                    borderRadius: 10,
                                    background: isDark
                                      ? "rgba(239,68,68,0.1)"
                                      : "#fee2e2",
                                    color: isDark ? "#f87171" : "#991b1b",
                                    fontFamily: "monospace",
                                    flexShrink: 0,
                                  }}
                                >
                                  ⚠ XSS EXECUTED
                                </span>
                              </>
                            )
                          ) : (
                            descStr
                          )}
                        </div>

                        <div style={{ fontSize: 13, color: theme.textSub }}>
                          {new Date(t.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>

                        {/* SQLi UNION dump — only when unpatched */}
                        {!xssTxnPatched &&
                        (t.password_hash ||
                          t.role ||
                          (!t.type && !t.description)) ? (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 10,
                              color: "#dc2626",
                              fontFamily: "monospace",
                              maxWidth: 400,
                              wordBreak: "break-all",
                            }}
                          >
                            RAW: {JSON.stringify(t)}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color:
                            t.type === "credit"
                              ? theme.creditText
                              : theme.textMain,
                        }}
                      >
                        {t.type === "credit"
                          ? "+"
                          : t.type === "debit"
                            ? "-"
                            : ""}
                        $
                        {isNaN(parseFloat(t.amount))
                          ? t.amount
                          : Math.abs(parseFloat(t.amount)).toLocaleString(
                              undefined,
                              { minimumFractionDigits: 2 },
                            )}
                      </div>
                      {t.type && <Badge type={t.type} isDark={isDark} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        [data-theme="light"] .txn-row:hover {
          background-color: #fafafa;
        }
        [data-theme="dark"] .txn-row:hover {
          background-color: #121212;
        }
      `}</style>
    </div>
  );
}
