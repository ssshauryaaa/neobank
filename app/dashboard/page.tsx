"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";
import { useTheme } from "../../components/ThemeProvider";

export default function Dashboard() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic theme colors
  const theme = {
    bgMain: isDark ? "#000000" : "#F9F8F6",
    textMain: isDark ? "#EDEDED" : "#1A1A1A",
    textSub: isDark ? "#A1A1AA" : "#8A7F6E",
    borderMain: isDark ? "#27272A" : "#EDEAE4",
    borderSub: isDark ? "#1A1A1A" : "#F5F3EF",
    cardBg: isDark ? "#0A0A0A" : "white",
    heroBg: isDark ? "#111111" : "#1A1A1A",
    iconBg: isDark ? "#1A1A1A" : "#F9F8F6",
    adminIconBg: isDark ? "#2A1F11" : "#FFF7ED",
    creditBg: isDark ? "rgba(34, 197, 94, 0.1)" : "#F0FDF4",
    creditText: isDark ? "#4ADE80" : "#166534",
    debitBg: isDark ? "rgba(239, 68, 68, 0.1)" : "#FFF1F2",
    debitText: isDark ? "#F87171" : "#991B1B",
  };

  useEffect(() => {
    const token =
      localStorage.getItem("forgedToken") || localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    fetch("/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((userData) => {
        if (!userData.success) return;

        setUser(userData.user);
        localStorage.setItem("user", JSON.stringify(userData.user));

        // 👇 NOW fetch only this user's transactions
        return fetch(`/api/transactions?userId=${userData.user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((r) => r?.json())
      .then((txnData) => {
        if (txnData?.success) {
          setTxns((txnData.transactions || []).slice(0, 5));
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: theme.bgMain,
          fontFamily: "Inter, sans-serif",
          transition: "background-color 0.3s ease",
        }}
      >
        <Sidebar />
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            className="spinner"
            style={{
              border: `3px solid ${theme.borderMain}`,
              borderTop: `3px solid ${theme.textMain}`,
              borderRadius: "50%",
              width: 24,
              height: 24,
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ color: theme.textSub, fontSize: 14, fontWeight: 500 }}>
            Preparing your dashboard...
          </span>
          <style jsx>{`
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </main>
      </div>
    );

  const balance = parseFloat(user?.balance || "0");
  const income = txns
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const spent = txns
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + parseFloat(t.amount), 0);

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
            Good morning, {user?.username}
          </h1>
          <p style={{ fontSize: 16, color: theme.textSub }}>
            Here is what is happening with your account today.
          </p>
        </header>

        {/* Hero Balance Card */}
        <div
          style={{
            background: theme.heroBg,
            border: isDark ? `1px solid ${theme.borderMain}` : "none",
            borderRadius: 24,
            padding: "40px",
            marginBottom: 32,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: isDark ? "none" : "0 20px 40px rgba(0,0,0,0.12)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#8A7F6E",
                marginBottom: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Total balance
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                color: "#FFFFFF",
              }}
            >
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 14,
                color: "#A1A1AA",
                fontFamily: "monospace",
                background: "rgba(255,255,255,0.05)",
                padding: "4px 12px",
                borderRadius: "99px",
                display: "inline-block",
              }}
            >
              {user?.account_number}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 48,
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              paddingLeft: 48,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#8A7F6E",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Income
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#4ADE80",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                +{income.toFixed(2)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#8A7F6E",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Expenses
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#F87171",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                -{spent.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 40,
          }}
        >
          {[
            {
              href: "/transfer",
              label: "Send money",
              icon: "↗",
            },
            {
              href: "/transactions",
              label: "History",
              icon: "▤",
            },
            {
              href: "/search",
              label: "Find people",
              icon: "⌕",
            },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="action-card"
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.borderMain}`,
                borderRadius: 20,
                padding: "24px",
                textDecoration: "none",
                color: theme.textMain,
                display: "flex",
                flexDirection: "column" as const,
                gap: 16,
                transition: "all 0.2s ease",
                boxShadow: isDark
                  ? "none"
                  : "0 4px 12px rgba(132, 125, 110, 0.04)",
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  background: theme.iconBg,
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  color: theme.textMain,
                }}
              >
                {a.icon}
              </span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{a.label}</span>
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="action-card"
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.borderMain}`,
                borderRadius: 20,
                padding: "24px",
                textDecoration: "none",
                color: theme.textMain,
                display: "flex",
                flexDirection: "column" as const,
                gap: 16,
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  background: theme.adminIconBg,
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  color: "#F97316",
                }}
              >
                ⚙
              </span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Recent Transactions List */}
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.borderMain}`,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: isDark ? "none" : "0 8px 24px rgba(132, 125, 110, 0.08)",
          }}
        >
          <div
            style={{
              padding: "24px 32px",
              borderBottom: `1px solid ${theme.borderSub}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: theme.textMain,
              }}
            >
              Recent Activity
            </h2>
            <Link
              href="/transactions"
              style={{
                fontSize: 14,
                color: theme.textSub,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View all activity
            </Link>
          </div>

          {txns.length === 0 ? (
            <div
              style={{
                padding: "64px 32px",
                textAlign: "center",
                color: theme.textSub,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>🧊</div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                No transactions found for this account.
              </p>
            </div>
          ) : (
            <div>
              {txns.map((t, i) => (
                <div
                  key={i}
                  className="txn-row"
                  style={{
                    padding: "20px 32px",
                    borderBottom:
                      i < txns.length - 1
                        ? `1px solid ${theme.borderSub}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background:
                          t.type === "credit" ? theme.creditBg : theme.debitBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        fontWeight: "bold",
                        color:
                          t.type === "credit"
                            ? theme.creditText
                            : theme.debitText,
                      }}
                    >
                      {t.type === "credit" ? "↓" : "↑"}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: theme.textMain,
                        }}
                      >
                        {t.description}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: theme.textSub,
                          marginTop: 2,
                        }}
                      >
                        {new Date(t.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color:
                        t.type === "credit" ? theme.creditText : theme.textMain,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t.type === "credit" ? "+" : "-"}$
                    {parseFloat(t.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        /* Dynamic hover styles using the data-theme attribute */
        [data-theme="light"] .action-card:hover {
          border-color: #1a1a1a !important;
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(132, 125, 110, 0.12) !important;
        }
        [data-theme="dark"] .action-card:hover {
          border-color: #52525b !important;
          transform: translateY(-2px);
          background: #111111 !important;
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
