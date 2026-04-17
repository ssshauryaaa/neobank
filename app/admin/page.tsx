"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/admin/users", { headers }).then((r) => r.json()),
      fetch("/api/admin/logs", { headers }).then((r) => r.json()),
    ])
      .then(([ud, ld]) => {
        if (ud.users) setUsers(ud.users);
        if (ld.logs) setLogs(ld.logs);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = users.reduce(
    (sum, u) => sum + parseFloat(u.balance || 0),
    0,
  );
  const adminCount = users.filter((u) => u.role === "admin").length;
  const recentLogs = logs.slice(0, 5);

  return (
    <div style={s.root}>
      <Sidebar />
      <main style={s.main}>
        {/* Header */}
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.h1}>Admin Panel</h1>
            <p style={s.sub}>
              Internal Management Dashboard — oversee user activity and database
              records.
            </p>
          </div>
          <Link href="/admin/logs" style={s.headerBtn}>
            View server logs →
          </Link>
        </div>

        {/* Stats */}
        <div style={s.statsGrid}>
          {[
            { label: "Total Users", value: loading ? "—" : users.length },
            { label: "Admin Accounts", value: loading ? "—" : adminCount },
            {
              label: "Total Balance",
              value: loading
                ? "—"
                : `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            },
            { label: "Active Sessions", value: "3" },
            { label: "Transfers (24h)", value: "12" },
            { label: "Encryption", value: "DISABLED", danger: true },
          ].map((stat) => (
            <div key={stat.label} style={s.statCard}>
              <div style={s.statLabel}>{stat.label}</div>
              <div
                style={{
                  ...s.statValue,
                  ...(stat.danger ? { color: "#DC2626" } : {}),
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 24,
            marginBottom: 28,
          }}
        >
          {/* Main user table */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Database Records</h2>
              <div style={s.countBadge}>{users.length} total objects</div>
            </div>

            {loading ? (
              <div style={s.loadingBox}>
                <p style={{ color: "#8A7F6E", fontSize: 14 }}>
                  Fetching secure records...
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr style={{ background: "#F9F8F6" }}>
                      {[
                        "ID",
                        "User Identity",
                        "Role",
                        "Account Balance",
                        "Plaintext Password",
                      ].map((h) => (
                        <th key={h} style={s.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom:
                            i < users.length - 1 ? "1px solid #F5F3EF" : "none",
                        }}
                      >
                        <td
                          style={{
                            ...s.td,
                            fontFamily: "monospace",
                            color: "#8A7F6E",
                          }}
                        >
                          #{u.id}
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 700 }}>{u.username}</div>
                          <div style={{ fontSize: 12, color: "#8A7F6E" }}>
                            {u.email}
                          </div>
                        </td>
                        <td style={s.td}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase" as const,
                              background:
                                u.role === "admin" ? "#1A1A1A" : "#F0F9FF",
                              color: u.role === "admin" ? "white" : "#075985",
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td style={{ ...s.td, fontWeight: 700 }}>
                          $
                          {parseFloat(u.balance || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td style={s.td}>
                          <span style={s.pwBadge}>{u.password}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Recent Activity</h2>
              <div
                style={{
                  ...s.countBadge,
                  background: "#F0FDF4",
                  color: "#166534",
                }}
              >
                Live
              </div>
            </div>
            {recentLogs.length === 0 ? (
              <div style={s.loadingBox}>
                <p style={{ color: "#8A7F6E", fontSize: 14 }}>
                  No activity yet.
                </p>
              </div>
            ) : (
              <div>
                {recentLogs.map((log, i) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "16px 20px",
                      borderBottom:
                        i < recentLogs.length - 1
                          ? "1px solid #F5F3EF"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            log.action?.includes("DELETE") ||
                            log.action?.includes("FAIL")
                              ? "#DC2626"
                              : "#1A1A1A",
                        }}
                      >
                        {log.action}
                      </span>
                      <span style={{ fontSize: 11, color: "#8A7F6E" }}>
                        {new Date(log.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#8A7F6E" }}>
                      User #{log.user_id} · {log.ip}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {[
            {
              href: "/admin/users",
              label: "User Management →",
              desc: "SQLi tester, full user table, filters",
            },
            {
              href: "/admin/logs",
              label: "Server Logs →",
              desc: "Real-time platform activity stream",
            },
            {
              href: "/admin/notes",
              label: "Admin Notes →",
              desc: "Internal secrets and flags",
            },
          ].map((link) => (
            <Link key={link.href} href={link.href} style={s.quickLink}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {link.label}
              </div>
              <div style={{ fontSize: 12, color: "#8A7F6E" }}>{link.desc}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "#F9F8F6",
    fontFamily: "Inter, sans-serif",
    color: "#1A1A1A",
  },
  main: { flex: 1, padding: "48px 64px", overflowY: "auto" },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 36,
  },
  h1: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    marginBottom: 8,
  },
  sub: { fontSize: 15, color: "#70685C" },
  headerBtn: {
    padding: "12px 24px",
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    color: "#1A1A1A",
    textDecoration: "none",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: 18,
    padding: "22px 20px",
    boxShadow: "0 4px 12px rgba(132,125,110,0.04)",
  },
  statLabel: {
    fontSize: 11,
    color: "#8A7F6E",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" },
  card: {
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(132,125,110,0.06)",
  },
  cardHeader: {
    padding: "18px 24px",
    borderBottom: "1px solid #F5F3EF",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: 700 },
  countBadge: {
    fontSize: 12,
    background: "#F9F8F6",
    padding: "4px 12px",
    borderRadius: 99,
    fontWeight: 600,
    color: "#8A7F6E",
  },
  loadingBox: { padding: 48, textAlign: "center" as const },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: {
    textAlign: "left" as const,
    padding: "12px 20px",
    fontSize: 10,
    fontWeight: 700,
    color: "#8A7F6E",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  td: { padding: "16px 20px" },
  pwBadge: {
    fontFamily: "monospace",
    fontSize: 12,
    background: "#FFF1F2",
    color: "#991B1B",
    padding: "4px 8px",
    borderRadius: 6,
  },
  quickLink: {
    display: "block",
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: 16,
    padding: "20px 24px",
    textDecoration: "none",
    color: "#1A1A1A",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
    transition: "all 0.2s",
  },
};
