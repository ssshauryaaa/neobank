"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────
type Severity = "critical" | "high" | "medium" | "low";
type LogEntry = {
  id: string;
  ts: number;
  type: "jwt_forge" | "sqli" | "idor" | "brute_force" | "recon";
  severity: Severity;
  ip: string;
  user: string;
  detail: string;
  patched: boolean;
  blocked: boolean;
  detected: boolean;
};

type DefenseAction = "detect" | "patch" | "block" | "restore";

type ScoreEntry = {
  action: DefenseAction;
  points: number;
  ts: number;
  detail: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fakeIp() {
  return `${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
}

const ATTACK_TEMPLATES: Omit<
  LogEntry,
  "id" | "ts" | "ip" | "patched" | "blocked" | "detected"
>[] = [
  {
    type: "jwt_forge",
    severity: "critical",
    user: "sys_admin_f",
    detail:
      'JWT payload forged: role escalated to "admin" via weak signing key',
  },
  {
    type: "sqli",
    severity: "critical",
    user: "anon_029",
    detail: "SQLi detected in authentication payload — UNION-based extraction",
  },
  {
    type: "idor",
    severity: "high",
    user: "client_994",
    detail:
      "IDOR: Sequential parameter manipulation attempting to access foreign accounts",
  },
  {
    type: "brute_force",
    severity: "medium",
    user: "unknown",
    detail:
      "Velocity threshold exceeded: 50+ login attempts from single origin",
  },
  {
    type: "recon",
    severity: "low",
    user: "crawler_bot",
    detail:
      "Directory traversal pattern matched in GET request — mapping attempt",
  },
  {
    type: "jwt_forge",
    severity: "critical",
    user: "service_acct",
    detail: 'Algorithm confusion attack: JWT header modified to alg:"none"',
  },
  {
    type: "sqli",
    severity: "critical",
    user: "anon_029",
    detail: "Blind SQL Injection: Boolean-based inference on user_data table",
  },
];

const SEVERITY_CONFIG: Record<
  Severity,
  { color: string; bg: string; label: string; glow: string }
> = {
  critical: {
    color: "#FF3366", // Modern coral-red
    bg: "rgba(255, 51, 102, 0.1)",
    label: "CRITICAL",
    glow: "rgba(255, 51, 102, 0.4)",
  },
  high: {
    color: "#FF9933", // Vibrant orange
    bg: "rgba(255, 153, 51, 0.1)",
    label: "HIGH",
    glow: "rgba(255, 153, 51, 0.3)",
  },
  medium: {
    color: "#FACC15", // Clean yellow
    bg: "rgba(250, 204, 21, 0.1)",
    label: "MEDIUM",
    glow: "rgba(250, 204, 21, 0.2)",
  },
  low: {
    color: "#38BDF8", // Sky blue
    bg: "rgba(56, 189, 248, 0.1)",
    label: "LOW",
    glow: "rgba(56, 189, 248, 0.2)",
  },
};

const TYPE_LABELS: Record<LogEntry["type"], string> = {
  jwt_forge: "JWT FORGERY",
  sqli: "SQL INJECTION",
  idor: "IDOR ATTACK",
  brute_force: "BRUTE FORCE",
  recon: "RECONNAISSANCE",
};

const ACTION_CONFIG: Record<
  DefenseAction,
  { label: string; points: number; color: string; key: string }
> = {
  detect: {
    label: "Acknowledge Threat",
    points: 40,
    color: "#38BDF8",
    key: "D",
  },
  patch: { label: "Deploy Hotfix", points: 60, color: "#34D399", key: "P" },
  block: { label: "Isolate Origin IP", points: 50, color: "#F87171", key: "B" },
  restore: {
    label: "Restore Integrity",
    points: 30,
    color: "#A78BFA",
    key: "R",
  },
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function DefensePage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<ScoreEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [alertFlash, setAlertFlash] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const attackRef = useRef<NodeJS.Timeout | null>(null);

  // Spawn attack logs periodically
  useEffect(() => {
    function spawnAttack() {
      const template =
        ATTACK_TEMPLATES[Math.floor(Math.random() * ATTACK_TEMPLATES.length)];
      const entry: LogEntry = {
        ...template,
        id: uid(),
        ts: Date.now(),
        ip: fakeIp(),
        patched: false,
        blocked: false,
        detected: false,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 100));

      if (entry.severity === "critical") {
        setAlertFlash(true);
        setTimeout(() => setAlertFlash(false), 500);
      }
    }

    spawnAttack();
    attackRef.current = setInterval(spawnAttack, isRunning ? 3500 : 99999);
    return () => {
      if (attackRef.current) clearInterval(attackRef.current);
    };
  }, [isRunning]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isRunning) setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const selectedLog = logs.find((l) => l.id === selected);

  function doAction(action: DefenseAction) {
    if (!selectedLog) return;
    const cfg = ACTION_CONFIG[action];

    // Validation rules
    if (action === "detect" && selectedLog.detected) {
      triggerToast("⚠ Threat already acknowledged", "warn");
      return;
    }
    if (action === "patch" && selectedLog.patched) {
      triggerToast("⚠ Vulnerability already patched", "warn");
      return;
    }
    if (action === "block" && selectedLog.blocked) {
      triggerToast("⚠ Origin already isolated", "warn");
      return;
    }
    if (action === "patch" && !selectedLog.detected) {
      triggerToast("⚠ Acknowledge threat before patching", "error");
      return;
    }

    setLogs((prev) =>
      prev.map((l) =>
        l.id === selectedLog.id
          ? {
              ...l,
              detected: action === "detect" ? true : l.detected,
              patched: action === "patch" ? true : l.patched,
              blocked: action === "block" ? true : l.blocked,
            }
          : l,
      ),
    );

    setScore((s) => s + cfg.points);
    const entry: ScoreEntry = {
      action,
      points: cfg.points,
      ts: Date.now(),
      detail: `${cfg.label} on ${TYPE_LABELS[selectedLog.type]}`,
    };
    setScoreHistory((h) => [entry, ...h].slice(0, 20));
    triggerToast(`+${cfg.points} — ${cfg.label}`, "success");
  }

  function triggerToast(msg: string, type: "success" | "warn" | "error") {
    setLastAction(msg);
    setTimeout(() => setLastAction(null), 2500);
  }

  function fmt(ts: number) {
    return new Date(ts)
      .toLocaleTimeString("en-US", {
        hour12: false,
        fractionalSecondDigits: 2,
      } as any)
      .replace(".", ":");
  }

  function fmtElapsed(s: number) {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  const criticalCount = logs.filter(
    (l) => l.severity === "critical" && !l.blocked,
  ).length;

  return (
    <div className="layout-root">
      {/* ── Alert Flash Overlay ── */}
      {alertFlash && <div className="flash-overlay" />}

      {/* ── Top Navigation Bar ── */}
      <header className="top-header">
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div className="team-badge">BLUE TEAM</div>
          <div className="brand-title">
            BREACH@TRIX <span>// OMNI-DEFENSE CONSOLE</span>
          </div>

          {criticalCount > 0 && (
            <div className="threat-indicator">
              <div className="pulse-dot" />
              <span>{criticalCount} CRITICAL THREATS</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div className="stat-block">
            <div className="stat-label">SYSTEM SCORE</div>
            <div className="stat-value text-green">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="stat-block">
            <div className="stat-label">UPTIME</div>
            <div
              className={`stat-value ${isRunning ? "text-yellow" : "text-muted"}`}
            >
              {fmtElapsed(elapsed)}
            </div>
          </div>

          <button
            onClick={() => setIsRunning((r) => !r)}
            className={`control-btn ${isRunning ? "btn-pause" : "btn-resume"}`}
          >
            {isRunning ? "⏸ PAUSE SIMULATION" : "▶ RESUME SIMULATION"}
          </button>
        </div>
      </header>

      {/* ── Main Dashboard Layout ── */}
      <div className="main-grid">
        {/* ── LEFT: Active Attack Log ── */}
        <div className="log-panel">
          <div className="panel-header">
            <span className="panel-title">
              LIVE NETWORK TRAFFIC ({logs.length})
            </span>
            <span className="panel-subtitle">Filter: All Events</span>
          </div>

          {/* Table Headers */}
          <div className="table-header">
            <span>TIMESTAMP</span>
            <span>SEVERITY</span>
            <span>VECTOR</span>
            <span>PAYLOAD / DETAILS</span>
            <span style={{ textAlign: "right" }}>STATUS</span>
          </div>

          <div className="log-container">
            {logs.map((log) => {
              const sev = SEVERITY_CONFIG[log.severity];
              const isSelected = selected === log.id;
              const isDone = log.patched && log.blocked;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelected(isSelected ? null : log.id)}
                  className={`log-row ${isSelected ? "selected" : ""} ${isDone ? "resolved" : ""}`}
                  style={{
                    borderLeftColor: isSelected ? sev.color : "transparent",
                    backgroundColor: isSelected ? sev.bg : undefined,
                  }}
                >
                  <span className="col-time">{fmt(log.ts)}</span>

                  <div className="col-sev">
                    <span
                      style={{
                        color: sev.color,
                        backgroundColor: sev.bg,
                        border: `1px solid ${sev.color}40`,
                      }}
                    >
                      {sev.label}
                    </span>
                  </div>

                  <span className="col-type">{TYPE_LABELS[log.type]}</span>
                  <span className="col-detail">{log.detail}</span>

                  <div className="col-status">
                    {log.detected && (
                      <span className="badge badge-det">ACK</span>
                    )}
                    {log.patched && (
                      <span className="badge badge-pat">FIX</span>
                    )}
                    {log.blocked && (
                      <span className="badge badge-blk">BLK</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* ── RIGHT: Inspector & Actions ── */}
        <div className="inspector-panel">
          {/* Selected Threat Details */}
          <div className="detail-card">
            <div
              className="panel-header"
              style={{ border: "none", padding: "0 0 16px 0" }}
            >
              <span className="panel-title">THREAT INSPECTOR</span>
            </div>

            {selectedLog ? (
              <div className="inspector-content fade-in">
                <div
                  className="threat-banner"
                  style={{
                    backgroundColor: SEVERITY_CONFIG[selectedLog.severity].bg,
                    border: `1px solid ${SEVERITY_CONFIG[selectedLog.severity].color}40`,
                    boxShadow: `0 4px 24px ${SEVERITY_CONFIG[selectedLog.severity].glow}`,
                  }}
                >
                  <div className="banner-header">
                    <span
                      style={{
                        color: SEVERITY_CONFIG[selectedLog.severity].color,
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {TYPE_LABELS[selectedLog.type]}
                    </span>
                    <span
                      className="banner-tag"
                      style={{
                        color: SEVERITY_CONFIG[selectedLog.severity].color,
                        borderColor:
                          SEVERITY_CONFIG[selectedLog.severity].color,
                      }}
                    >
                      {SEVERITY_CONFIG[selectedLog.severity].label}
                    </span>
                  </div>
                  <div className="banner-desc">{selectedLog.detail}</div>

                  <div className="meta-grid">
                    <div className="meta-item">
                      <span className="meta-label">SOURCE IP</span>
                      <span className="meta-value">{selectedLog.ip}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">TARGET USER</span>
                      <span className="meta-value">{selectedLog.user}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">EVENT ID</span>
                      <span className="meta-value">
                        {selectedLog.id.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="action-grid">
                  {(
                    Object.entries(ACTION_CONFIG) as [
                      DefenseAction,
                      (typeof ACTION_CONFIG)[DefenseAction],
                    ][]
                  ).map(([action, cfg]) => {
                    const disabled =
                      (action === "detect" && selectedLog.detected) ||
                      (action === "patch" &&
                        (selectedLog.patched || !selectedLog.detected)) ||
                      (action === "block" && selectedLog.blocked);

                    return (
                      <button
                        key={action}
                        onClick={() => doAction(action)}
                        disabled={disabled}
                        className={`action-btn ${disabled ? "disabled" : ""}`}
                        style={
                          {
                            "--theme-color": cfg.color,
                          } as React.CSSProperties
                        }
                      >
                        <div className="btn-text">{cfg.label}</div>
                        <div className="btn-pts">+{cfg.points}</div>
                      </button>
                    );
                  })}
                </div>

                {lastAction && (
                  <div
                    className={`toast-msg ${lastAction.includes("⚠") ? "toast-warn" : "toast-success"}`}
                  >
                    {lastAction}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">⛊</div>
                <div>AWAITING THREAT SELECTION</div>
                <div style={{ opacity: 0.5, fontSize: 11, marginTop: 4 }}>
                  Click any row in the network log to inspect
                </div>
              </div>
            )}
          </div>

          {/* Activity Ledger */}
          <div className="history-card">
            <div className="panel-header" style={{ padding: "0 0 12px 0" }}>
              <span className="panel-title">RESPONSE LEDGER</span>
            </div>

            <div className="history-list">
              {scoreHistory.length === 0 ? (
                <div className="empty-state" style={{ height: "100px" }}>
                  No actions recorded
                </div>
              ) : (
                scoreHistory.map((h, i) => {
                  const cfg = ACTION_CONFIG[h.action];
                  return (
                    <div key={i} className="history-row fade-in">
                      <div>
                        <div
                          style={{
                            color: cfg.color,
                            fontWeight: 600,
                            fontSize: 11,
                            letterSpacing: "0.05em",
                          }}
                        >
                          {cfg.label.toUpperCase()}
                        </div>
                        <div
                          style={{
                            color: "#64748B",
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {h.detail}
                        </div>
                      </div>
                      <div
                        style={{
                          color: "#34D399",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        +{h.points}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap");

        * {
          box-sizing: border-box;
        }

        .layout-root {
          min-height: 100vh;
          background: radial-gradient(
            circle at 50% -20%,
            #1a1b2e 0%,
            #05050a 100%
          );
          font-family: "Inter", sans-serif;
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Nav Header */
        .top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 64px;
          background: rgba(10, 10, 18, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 100;
        }

        .team-badge {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          padding: 6px 12px;
          border-radius: 4px;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
        }

        .brand-title {
          font-family: "JetBrains Mono", monospace;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .brand-title span {
          color: #64748b;
          font-weight: 400;
        }

        .threat-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 51, 102, 0.1);
          border: 1px solid rgba(255, 51, 102, 0.3);
          border-radius: 6px;
          padding: 6px 14px;
        }
        .threat-indicator span {
          font-size: 11px;
          color: #ff3366;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .stat-block {
          text-align: right;
        }
        .stat-label {
          font-size: 10px;
          color: #64748b;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .stat-value {
          font-family: "JetBrains Mono", monospace;
          font-size: 24px;
          font-weight: 700;
          line-height: 1;
        }

        .text-green {
          color: #34d399;
          text-shadow: 0 0 16px rgba(52, 211, 153, 0.3);
        }
        .text-yellow {
          color: #facc15;
        }
        .text-muted {
          color: #64748b;
        }

        .control-btn {
          font-family: "Inter", sans-serif;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-pause {
          background: rgba(250, 204, 21, 0.1);
          border: 1px solid #facc15;
          color: #facc15;
        }
        .btn-pause:hover {
          background: rgba(250, 204, 21, 0.2);
          box-shadow: 0 0 12px rgba(250, 204, 21, 0.2);
        }
        .btn-resume {
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid #34d399;
          color: #34d399;
        }
        .btn-resume:hover {
          background: rgba(52, 211, 153, 0.2);
          box-shadow: 0 0 12px rgba(52, 211, 153, 0.2);
        }

        /* Dashboard Grid */
        .main-grid {
          display: grid;
          grid-template-columns: 1fr 420px;
          flex: 1;
          height: calc(100vh - 64px);
        }

        /* Left Panel - Logs */
        .log-panel {
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.2);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .panel-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: #94a3b8;
        }
        .panel-subtitle {
          font-size: 12px;
          color: #475569;
        }

        .table-header {
          display: grid;
          grid-template-columns: 100px 100px 140px 1fr 100px;
          padding: 12px 24px;
          background: rgba(15, 23, 42, 0.5);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.1em;
        }

        .log-container {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 24px;
        }

        .log-row {
          display: grid;
          grid-template-columns: 100px 100px 140px 1fr 100px;
          align-items: center;
          padding: 12px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          border-left: 3px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: "JetBrains Mono", monospace;
        }
        .log-row:hover:not(.selected) {
          background: rgba(255, 255, 255, 0.02);
        }
        .log-row.resolved {
          opacity: 0.4;
          filter: grayscale(50%);
        }
        .log-row.resolved:hover {
          opacity: 0.8;
        }

        .col-time {
          font-size: 12px;
          color: #64748b;
        }
        .col-sev span {
          font-family: "Inter", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        .col-type {
          font-size: 12px;
          color: #cbd5e1;
        }
        .col-detail {
          font-size: 13px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: "Inter", sans-serif;
          padding-right: 20px;
        }
        .col-status {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
        }

        .badge {
          font-family: "Inter", sans-serif;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .badge-det {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
        }
        .badge-pat {
          color: #34d399;
          background: rgba(52, 211, 153, 0.15);
          border: 1px solid rgba(52, 211, 153, 0.3);
        }
        .badge-blk {
          color: #f87171;
          background: rgba(248, 113, 113, 0.15);
          border: 1px solid rgba(248, 113, 113, 0.3);
        }

        /* Right Panel - Inspector */
        .inspector-panel {
          display: flex;
          flex-direction: column;
          background: rgba(10, 10, 18, 0.3);
        }

        .detail-card {
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
        }
        .history-card {
          padding: 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .history-list {
          flex: 1;
          overflow-y: auto;
          padding-right: 8px;
        }

        .threat-banner {
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }
        .banner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .banner-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          border-width: 1px;
          border-style: solid;
          background: rgba(0, 0, 0, 0.2);
        }
        .banner-desc {
          font-size: 14px;
          line-height: 1.5;
          color: #f1f5f9;
          margin-bottom: 20px;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background: rgba(0, 0, 0, 0.2);
          padding: 16px;
          border-radius: 6px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .meta-label {
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .meta-value {
          font-family: "JetBrains Mono", monospace;
          font-size: 13px;
          color: #e2e8f0;
        }

        .action-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        .action-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
        }
        .action-btn:not(.disabled):hover {
          background: color-mix(in srgb, var(--theme-color) 15%, transparent);
          border-color: color-mix(in srgb, var(--theme-color) 50%, transparent);
          transform: translateY(-1px);
        }
        .action-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: rgba(0, 0, 0, 0.2);
        }
        .btn-text {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .btn-pts {
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          color: var(--theme-color);
          font-weight: 700;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.05em;
        }
        .empty-icon {
          font-size: 48px;
          opacity: 0.2;
          margin-bottom: 16px;
        }

        .history-row {
          padding: 14px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .toast-msg {
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .toast-success {
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid rgba(52, 211, 153, 0.3);
          color: #34d399;
        }
        .toast-warn {
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          color: #f87171;
        }

        /* Animations */
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff3366;
          animation: pulse 1.5s infinite;
          box-shadow: 0 0 10px #ff3366;
        }
        .flash-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          border: 4px solid #ff3366;
          background: rgba(255, 51, 102, 0.05);
          pointer-events: none;
          animation: flash 0.5s ease-out forwards;
        }
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
        @keyframes flash {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scrollbars */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
