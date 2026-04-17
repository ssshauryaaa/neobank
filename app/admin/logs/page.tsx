"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../../components/Sidebar";
import Link from "next/link";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"logs" | "notes">("logs");

  useEffect(() => {
    fetch("/api/admin/logs")
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
        if (data.admin_notes) setNotes(data.admin_notes);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={s.root}>
      <Sidebar />
      <main style={s.main}>
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.h1}>Server Logs</h1>
            <p style={s.sub}>Real-time platform activity and system events.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              style={s.secondaryBtn}
              onClick={() => window.location.reload()}
            >
              ↻ Refresh
            </button>
            <Link href="/admin" style={s.backBtn}>
              ← Back to Admin
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsGrid}>
          {[
            { label: "Total Events", value: logs.length },
            { label: "Admin Notes", value: notes.length, danger: true },
            { label: "Unique IPs", value: new Set(logs.map((l) => l.ip)).size },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                ...s.statCard,
                ...(stat.danger ? s.statCardDanger : {}),
              }}
            >
              <div
                style={{
                  ...s.statLabel,
                  ...(stat.danger ? { color: "#B91C1C" } : {}),
                }}
              >
                {stat.label}
              </div>
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

        {/* Tabs */}
        <div style={s.tabContainer}>
          <button
            onClick={() => setTab("logs")}
            style={{ ...s.tabBtn, ...(tab === "logs" ? s.tabActive : {}) }}
          >
            Activity Stream
          </button>
          <button
            onClick={() => setTab("notes")}
            style={{ ...s.tabBtn, ...(tab === "notes" ? s.tabActive : {}) }}
          >
            Admin Notes{" "}
            {notes.length > 0 && (
              <span style={s.noteCount}>{notes.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div style={s.card}>
          {tab === "logs" && (
            <>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Activity Stream</h2>
                <div
                  style={{
                    ...s.badge,
                    background: "#F0FDF4",
                    color: "#166534",
                    border: "1px solid #BBF7D0",
                  }}
                >
                  <span style={s.pulseIndicator}></span> Live Status: Active
                </div>
              </div>

              {loading ? (
                <div style={s.emptyState}>
                  <div style={s.spinner}></div>
                  <p style={s.emptyText}>Polling server for latest events...</p>
                </div>
              ) : logs.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>📭</div>
                  <p style={s.emptyText}>No platform activity recorded yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={s.table}>
                    <thead>
                      <tr
                        style={{
                          background: "#F9F8F6",
                          borderBottom: "1px solid #EDEAE4",
                        }}
                      >
                        {[
                          "Timestamp",
                          "Action",
                          "Entity",
                          "Network ID",
                          "Event Details",
                        ].map((h) => (
                          <th key={h} style={s.th}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => (
                        <tr
                          key={log.id}
                          style={{
                            borderBottom:
                              i < logs.length - 1
                                ? "1px solid #F5F3EF"
                                : "none",
                            transition: "background 0.2s ease",
                          }}
                        >
                          <td
                            style={{
                              ...s.td,
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: "#8A7F6E",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {new Date(log.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td style={s.td}>
                            <span
                              style={{
                                ...s.actionBadge,
                                background: log.action?.includes("DELETE")
                                  ? "#FEF2F2"
                                  : "#F3F4F6",
                                color: log.action?.includes("DELETE")
                                  ? "#DC2626"
                                  : "#374151",
                              }}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td
                            style={{
                              ...s.td,
                              color: "#4B453C",
                              fontWeight: 500,
                            }}
                          >
                            User #{log.user_id}
                          </td>
                          <td
                            style={{
                              ...s.td,
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: "#8A7F6E",
                            }}
                          >
                            {log.ip}
                          </td>
                          <td
                            style={{ ...s.td, color: "#70685C", maxWidth: 320 }}
                          >
                            <div style={s.truncateText}>{log.details}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "notes" && (
            <>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Admin Notes</h2>
                <div
                  style={{
                    ...s.badge,
                    background: "#FEF2F2",
                    color: "#B91C1C",
                    border: "1px solid #FECACA",
                  }}
                >
                  ⚠ Exposed via /api/admin/logs
                </div>
              </div>

              {loading ? (
                <div style={s.emptyState}>
                  <div style={s.spinner}></div>
                </div>
              ) : notes.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>📝</div>
                  <p style={s.emptyText}>No admin notes found.</p>
                </div>
              ) : (
                <div style={s.notesContainer}>
                  {notes.map((n: any) => (
                    <div key={n.id} style={s.noteCard}>
                      <div style={s.noteHeader}>⚑ Secret #{n.id}</div>
                      <div style={s.noteBody}>{n.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#1A1A1A",
  },
  main: {
    flex: 1,
    padding: "48px 64px",
    overflowY: "auto",
    maxWidth: 1200,
    margin: "0 auto",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  h1: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    marginBottom: 6,
    color: "#111",
  },
  sub: { fontSize: 15, color: "#70685C", margin: 0 },
  backBtn: {
    padding: "10px 20px",
    background: "#1A1A1A",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    color: "white",
    textDecoration: "none",
    transition: "transform 0.2s ease, opacity 0.2s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  secondaryBtn: {
    padding: "10px 20px",
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    color: "#1A1A1A",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(132,125,110,0.04)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 20,
    marginBottom: 32,
  },
  statCard: {
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 4px 12px rgba(132,125,110,0.03)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  statCardDanger: {
    background: "#FFFAFA",
    border: "1px solid #FEE2E2",
  },
  statLabel: {
    fontSize: 12,
    color: "#8A7F6E",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#111",
  },
  tabContainer: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    padding: "4px",
    background: "#EBE8E0",
    borderRadius: 14,
    width: "fit-content",
  },
  tabBtn: {
    padding: "10px 24px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    color: "#70685C",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.2s ease",
  },
  tabActive: {
    background: "white",
    color: "#1A1A1A",
    boxShadow: "0 2px 8px rgba(132,125,110,0.12)",
  },
  noteCount: {
    fontSize: 11,
    fontWeight: 800,
    background: "#DC2626",
    color: "white",
    padding: "2px 8px",
    borderRadius: 99,
  },
  card: {
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(132,125,110,0.04)",
  },
  cardHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #F5F3EF",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#FCFBFA",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: 0 },
  badge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 99,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    background: "#22C55E",
    borderRadius: "50%",
    display: "inline-block",
  },
  emptyState: {
    padding: "64px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  emptyIcon: { fontSize: 48, opacity: 0.5 },
  emptyText: { color: "#8A7F6E", fontSize: 15, margin: 0, fontWeight: 500 },
  spinner: {
    width: 24,
    height: 24,
    border: "3px solid #F5F3EF",
    borderTop: "3px solid #1A1A1A",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "14px 24px",
    fontSize: 11,
    fontWeight: 700,
    color: "#8A7F6E",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  td: { padding: "16px 24px", verticalAlign: "middle" },
  actionBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  truncateText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  notesContainer: {
    padding: 24,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  noteCard: {
    background: "#FFF5F5",
    border: "1px solid #FECACA",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.04)",
  },
  noteHeader: {
    fontSize: 11,
    fontWeight: 800,
    color: "#B91C1C",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  noteBody: {
    fontFamily: "monospace",
    fontSize: 14,
    color: "#7F1D1D",
    lineHeight: 1.6,
  },
};
