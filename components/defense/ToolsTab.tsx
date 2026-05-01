"use client";
import React, { useState } from "react";
import type { AttackType, ScoreEntry } from "@/types";
import { TYPE_LABELS, TYPE_COLORS, mono, sans } from "@/constants/theme";
import { CHALLENGES } from "@/challenges";
import { ScoreLedger } from "@/components/ScoreLedger";

// ── Quick Reference data ──────────────────────────────────────────────────────

const ALL_TYPES: AttackType[] = [
  "jwt_forge", "sqli_login", "sqli_search", "idor", "xss",
  "sqli_txn", "sqli_txn_insert", "xss_txn", "open_redirect",
  "xss_profile", "mass_assignment", "ssrf",
];

const SEV_MAP: Record<AttackType, { label: string; color: string; bg: string; border: string }> = {
  jwt_forge: { label: "CRITICAL", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  sqli_login: { label: "CRITICAL", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  sqli_search: { label: "CRITICAL", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  idor: { label: "HIGH", color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  xss: { label: "HIGH", color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  sqli_txn: { label: "HIGH", color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  sqli_txn_insert: { label: "HIGH", color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  xss_txn: { label: "MEDIUM", color: "#d97706", bg: "#fefce8", border: "#fde047" },
  open_redirect: { label: "MEDIUM", color: "#d97706", bg: "#fefce8", border: "#fde047" },
  xss_profile: { label: "HIGH", color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  mass_assignment: { label: "CRITICAL", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  ssrf: { label: "CRITICAL", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
};

const DETECT_MAP: Record<AttackType, string> = {
  jwt_forge: "Look for alg:none JWTs or use of hardcoded secret in jwt.verify(). Token header shows \"alg\":\"none\" when forged.",
  sqli_login: "Auth bypass via ' OR '1'='1'-- or admin'--. Template literal in query string instead of parameterized query.",
  sqli_search: "UNION SELECT attacks on ?q= param. Raw ${query} interpolation inside SQL string.",
  idor: "Fetch /api/user?id=X where X != your own user ID. Missing ownership check in route.",
  xss: "dangerouslySetInnerHTML in transfer/transactions page. Look for __html: value pattern.",
  sqli_txn: "userId taken directly from URL query params; no auth token check; raw ${userId} in SQL.",
  sqli_txn_insert: "POST /api/transactions with forged fromUserId; no token verification; raw INSERT concatenation.",
  xss_txn: "JSON.stringify(t) or t.password_hash rendered directly in JSX in transaction list.",
  open_redirect: "/api/redirect?next=https://evil.com — no allowlist check before NextResponse.redirect.",
  xss_profile: "Bio field rendered via dangerouslySetInnerHTML. <img src=x onerror=alert(1)> payload.",
  mass_assignment: "PATCH /api/profile accepts {role:admin, balance:999999} with no field allowlist.",
  ssrf: "POST /api/fetch-url with {url:\"http://169.254.169.254/\"} — server fetches any URL.",
};

const FIX_MAP: Record<AttackType, string> = {
  jwt_forge: "Lock algorithms: jwt.verify(token, secret, { algorithms: ['HS256'] }). Remove || 'secret' fallback.",
  sqli_login: "Use parameterized query: db.query('SELECT * FROM users WHERE username=? AND password=?', [u, p]).",
  sqli_search: "Parameterized LIKE: db.query('... WHERE username LIKE ?', [`%${query}%`]).",
  idor: "Compare decoded.id === dbUser.id after fetch. Return 403 if mismatch.",
  xss: "Remove dangerouslySetInnerHTML. Use {value} JSX expression — React escapes it automatically.",
  sqli_txn: "Extract user ID from JWT token, not URL params. Use parameterized SELECT with token ID.",
  sqli_txn_insert: "Verify token matches fromUserId. Validate amount > 0. Parameterize INSERT statement.",
  xss_txn: "Remove JSON.stringify renders. Never show t.password_hash. Render only expected fields.",
  open_redirect: "Define ALLOWED_PATHS = ['/dashboard', ...]. Return 400 if next not in allowlist.",
  xss_profile: "Replace dangerouslySetInnerHTML with {bio} JSX expression in profile component.",
  mass_assignment: "const ALLOWED_FIELDS = ['username','email','bio']. Filter body keys before SQL UPDATE.",
  ssrf: "Block private IPs: /^https?:\\/\\/localhost/i, /127\\./, /192\\.168\\./, /169\\.254\\./ etc.",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ── Tool sidebar items ────────────────────────────────────────────────────────

type ToolId = "ledger" | "reference";

const TOOLS: { id: ToolId; icon: React.ReactNode; label: string; desc: string; accent: string; activeBg: string }[] = [
  { id: "ledger", icon: <ChartIcon />, label: "Score Ledger", desc: "All patch events and points earned", accent: "#ea580c", activeBg: "#fff7ed" },
  { id: "reference", icon: <BookIcon />, label: "Quick Reference", desc: "Detect, exploit & fix each vulnerability", accent: "#059669", activeBg: "#ecfdf5" },
];

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  scoreHistory: ScoreEntry[];
};

export function ToolsTab({ scoreHistory }: Props) {
  const [activeTool, setActiveTool] = useState<ToolId>("ledger");
  const [openType, setOpenType] = useState<AttackType | null>(null);

  return (
    <div className="tools-tab-container" style={{ flex: 1, display: "flex", minHeight: 0, background: "#f8fafc", color: "#0f172a" }}>

      {/* Injecting CSS for clean hover animations without cluttering React state */}
      <style>{`
        .sidebar-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-btn:hover:not(.active) {
          background-color: #f1f5f9;
          transform: translateX(4px);
        }
        .accordion-header {
          transition: all 0.2s ease;
        }
        .accordion-header:hover {
          background-color: #f8fafc;
        }
        .accordion-card {
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .accordion-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border-color: #cbd5e1;
        }
      `}</style>

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <div style={{
        width: 280, flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex", flexDirection: "column",
        padding: "24px 16px",
        gap: 12,
        boxShadow: "1px 0 10px rgba(0,0,0,0.02)"
      }}>
        <div style={{ marginBottom: 16, paddingLeft: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: ".08em", textTransform: "uppercase" }}>
            Defender Tools
          </div>
        </div>

        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              className={`sidebar-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              style={{
                fontFamily: sans, textAlign: "left", cursor: "pointer",
                padding: "16px", borderRadius: 10,
                border: isActive ? `1px solid ${tool.accent}40` : "1px solid transparent",
                background: isActive ? tool.activeBg : "transparent",
                display: "flex", alignItems: "flex-start", gap: 14,
              }}
            >
              <span style={{
                color: isActive ? tool.accent : "#64748b",
                marginTop: 2,
                transition: "color 0.2s ease"
              }}>
                {tool.icon}
              </span>
              <div>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: isActive ? tool.accent : "#334155",
                  marginBottom: 4,
                  transition: "color 0.2s ease"
                }}>
                  {tool.label}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                  {tool.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Right content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>

        {/* Score Ledger */}
        {activeTool === "ledger" && (
          <div style={{ padding: "40px 48px", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                Score Ledger
              </div>
              <div style={{ fontSize: 15, color: "#64748b" }}>
                A chronological record of all patch events and points awarded this session.
              </div>
            </div>
            <div style={{
              background: "#ffffff", borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}>
              <ScoreLedger scoreHistory={scoreHistory} />
            </div>
          </div>
        )}

        {/* Quick Reference */}
        {activeTool === "reference" && (
          <div style={{ padding: "40px 48px", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                Quick Reference
              </div>
              <div style={{ fontSize: 15, color: "#64748b" }}>
                Detection patterns, secure fixes, and example payloads for each attack type.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ALL_TYPES.map((type) => {
                const sev = SEV_MAP[type];
                const challenge = CHALLENGES[type];
                const isOpen = openType === type;

                // Fallback pill colors if TYPE_COLORS isn't perfectly adapted for light mode
                const typePillBg = TYPE_COLORS?.[type]?.bg || "#f1f5f9";
                const typePillText = TYPE_COLORS?.[type]?.text || "#334155";
                const typePillBorder = TYPE_COLORS?.[type]?.border || "#cbd5e1";

                return (
                  <div key={type} className="accordion-card" style={{
                    border: `1px solid ${isOpen ? "#cbd5e1" : "#e2e8f0"}`,
                    borderRadius: 12,
                    background: "#ffffff",
                    overflow: "hidden",
                  }}>
                    {/* Header */}
                    <button
                      className="accordion-header"
                      onClick={() => setOpenType(isOpen ? null : type)}
                      style={{
                        fontFamily: sans, width: "100%", textAlign: "left",
                        padding: "16px 20px", cursor: "pointer",
                        background: isOpen ? "#f8fafc" : "transparent",
                        border: "none", borderBottom: isOpen ? "1px solid #e2e8f0" : "1px solid transparent",
                        display: "flex", alignItems: "center", gap: 16,
                      }}
                    >
                      <span style={{
                        fontSize: 12, transition: "transform .2s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "inline-block",
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        color: "#94a3b8",
                      }}>
                        ▶
                      </span>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          padding: "4px 10px", borderRadius: 6,
                          color: typePillText, background: typePillBg, border: `1px solid ${typePillBorder}`,
                        }}>
                          {TYPE_LABELS[type]}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                          {challenge?.title ?? TYPE_LABELS[type]}
                        </span>
                      </div>

                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                        color: sev.color, background: sev.bg, border: `1px solid ${sev.border}`,
                        letterSpacing: ".05em",
                      }}>
                        {sev.label}
                      </span>
                    </button>

                    {/* Body */}
                    {isOpen && (
                      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16, background: "#ffffff" }}>

                        {/* DETECTION */}
                        <div style={{ background: "#fef2f2", borderLeft: "3px solid #ef4444", borderRadius: "0 8px 8px 0", padding: "16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", letterSpacing: ".06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <AlertIcon />
                            DETECTION
                          </div>
                          <code style={{ fontSize: 13, color: "#7f1d1d", fontFamily: mono, lineHeight: 1.6 }}>
                            {DETECT_MAP[type]}
                          </code>
                        </div>

                        {/* SECURE FIX */}
                        <div style={{ background: "#ecfdf5", borderLeft: "3px solid #10b981", borderRadius: "0 8px 8px 0", padding: "16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#047857", letterSpacing: ".06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <ShieldIcon />
                            SECURE FIX
                          </div>
                          <code style={{ fontSize: 13, color: "#065f46", fontFamily: mono, lineHeight: 1.6 }}>
                            {FIX_MAP[type]}
                          </code>
                        </div>

                        {/* POINTS */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                          <span style={{
                            fontSize: 13, fontWeight: 600, color: "#ea580c",
                            background: "#fff7ed", border: "1px solid #fed7aa",
                            borderRadius: 8, padding: "6px 14px",
                          }}>
                            +{challenge?.points ?? 0} pts on patch
                          </span>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}