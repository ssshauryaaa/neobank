"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

// Reusable components for cleaner code
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

  // Dynamic theme colors matching the dashboard
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

  const filteredTxns = useMemo(
    () => (filter === "all" ? txns : txns.filter((t) => t.type === filter)),
    [filter, txns],
  );

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
        {/* Header Section */}
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
                onClick={() => setFilter(f)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background:
                    filter === f ? theme.filterActiveBg : "transparent",
                  color: filter === f ? theme.textMain : theme.textSub,
                  boxShadow:
                    filter === f && !isDark
                      ? "0 2px 4px rgba(0,0,0,0.05)"
                      : "none",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Content Card */}
        <div
          style={{
            background: theme.cardBg,
            borderRadius: 20,
            boxShadow: isDark
              ? "none"
              : "0 1px 3px rgba(0,0,0,0.02), 0 8px 24px rgba(132, 125, 110, 0.08)",
            border: `1px solid ${theme.borderMain}`,
            overflow: "hidden",
          }}
        >
          {loading ? (
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
          ) : filteredTxns.length === 0 ? (
            <div style={{ padding: "80px 40px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🍃</div>
              <p
                style={{ color: theme.textSub, fontSize: 15, fontWeight: 500 }}
              >
                No transactions found for this period.
              </p>
            </div>
          ) : (
            <div>
              {filteredTxns.map((t, i) => (
                <div
                  key={t.id || i}
                  className="txn-row"
                  style={{
                    padding: "20px 32px",
                    borderBottom:
                      i < filteredTxns.length - 1
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
                      {t.type === "credit" ? "+" : "-"}$
                      {Math.abs(parseFloat(t.amount)).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </div>
                    <Badge type={t.type} isDark={isDark} />
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
        /* Hover effects respecting the theme */
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
