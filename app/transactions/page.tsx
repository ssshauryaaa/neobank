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

  // ── Manual userId lookup — the IDOR/SQLi entry point ──────────────────
  const runLookup = async () => {
    if (!manualUserId.trim()) return;
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
        // Server echoes back the raw query on success — grab it
        if (data.query) setRawQuery(data.query);
      } else {
        // Server leaks query + stack on error
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
        {/* Header */}
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

            {/* Debug hint — visible bait for red teamers */}
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
          </div>

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

        {/* ── userId lookup panel ───────────────────────────────────────────
             This is the IDOR + SQLi attack surface.
             No auth check, no sanitization — userId goes straight into the query.
             Try:  2          → another user's transactions (IDOR)
             Try:  1 OR 1=1  → all transactions (SQLi boolean)
             Try:  1 UNION SELECT id,username,email,password_hash,role,balance,account_number,created_at FROM users--
                              → dump users table
        ─────────────────────────────────────────────────────────────────── */}
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

          {/* Raw query leak — server echoes it back on both success and error */}
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

          {/* Error message leak */}
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

          {/* IDOR success indicator */}
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

        {/* Transaction list card */}
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
          {/* Lookup mode header */}
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
              {displayTxns.map((t, i) => (
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
                          t.type === "credit" ? theme.creditBg : theme.debitBg,
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
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: theme.textMain,
                          marginBottom: 2,
                        }}
                      >
                        {t.description}
                      </div>
                      <div style={{ fontSize: 13, color: theme.textSub }}>
                        {new Date(t.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      {/* Show raw row dump when IDOR returns unexpected columns (SQLi dump) */}
                      {t.password_hash ||
                      t.role ||
                      (!t.type && !t.description) ? (
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
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                    </div>
                    {t.type && <Badge type={t.type} isDark={isDark} />}
                  </div>
                </div>
              ))}
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
