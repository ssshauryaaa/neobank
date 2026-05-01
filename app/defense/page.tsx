"use client";

import React, { useState, useEffect } from "react";
import type { AttackType } from "@/types";
import {
  C,
  mono,
  sans,
  TYPE_LABELS,
  PATCH_KEYS,
  PATCH_TARGET_MAP,
} from "@/constants/theme";
import { CHALLENGES } from "@/challenges";
import {
  useAttackLogger,
  useToast,
  useChallengeState,
} from "@/hooks";
import {
  TwoFileModal,
  SingleModal,
} from "../../components";
import { LogsTab } from "@/components/defense/LogsTab";
import { InvestigateTab } from "@/components/defense/InvestigateTab";
import { ScanTab } from "@/components/defense/ScanTab";
import { ToolsTab } from "@/components/defense/ToolsTab";
import { CodebaseTab } from "@/components/defense/CodebaseTab";

import {
  Activity,
  Search,
  ShieldCheck,
  Wrench,
  FolderCode,
  type LucideIcon
} from "lucide-react";

type Tab = "logs" | "investigate" | "scan" | "tools" | "codebase";

export default function DefensePage() {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("logs");
  const [score, setScore] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<
    { points: number; ts: number; detail: string; type: AttackType }[]
  >([]);
  const [patchedTypes, setPatchedTypes] = useState<Set<AttackType>>(new Set());

  const [toast, showToast] = useToast();
  const { logs, setLogs, alertFlash } = useAttackLogger(patchedTypes);
  const cs = useChallengeState();

  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function handleAuth() {
    if (pw === "defending") {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPw("");
    }
  }

  const challenge = cs.type ? CHALLENGES[cs.type] : null;

  // ── Scanner bonus ─────────────────────────────────────────────────────────

  function handleScanComplete(pts: number) {
    setScore((s) => s + pts);
    setScoreHistory((h) =>
      [
        { points: pts, ts: Date.now(), detail: "Active vulnerability scan completed", type: "xss" as AttackType },
        ...h,
      ].slice(0, 30),
    );
    showToast(`🔍 Scan complete — ${pts} bonus pts awarded!`);
  }

  // ── Patch application ─────────────────────────────────────────────────────

  function applyPatch(type: AttackType, points: number) {
    setLogs((prev) =>
      prev.map((l) => (l.type === type ? { ...l, patched: true } : l)),
    );
    setPatchedTypes((prev) => new Set(Array.from(prev).concat(type)));

    const lsKey = PATCH_KEYS[type];
    if (lsKey) localStorage.setItem(lsKey, "1");

    const apiTarget = PATCH_TARGET_MAP[type];
    if (apiTarget) {
      fetch("/api/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: apiTarget, action: "apply" }),
      }).catch(() => { });
    }

    setScore((s) => s + points);
    setScoreHistory((h) =>
      [
        {
          points,
          ts: Date.now(),
          detail: `${TYPE_LABELS[type]} patched globally`,
          type,
        },
        ...h,
      ].slice(0, 30),
    );
  }

  // ── Inspector actions ─────────────────────────────────────────────────────

  function acknowledge(logId: string) {
    const log = logs.find((l) => l.id === logId);
    if (!log) return;
    if (log.detected) {
      showToast("Already acknowledged", false);
      return;
    }
    setLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, detected: true } : l)),
    );
    showToast("Threat acknowledged — go to Investigate tab to view the code and patch it");
  }

  function openPatch(logId: string) {
    const log = logs.find((l) => l.id === logId);
    if (!log) return;
    if (!log.detected) {
      showToast("Acknowledge the threat first", false);
      return;
    }
    if (patchedTypes.has(log.type)) {
      showToast("This vulnerability is already patched globally", false);
      return;
    }
    cs.openChallenge(log.type);
  }

  // ── Challenge submit handlers ─────────────────────────────────────────────

  function submitSingle() {
    if (!cs.type || !challenge || challenge.kind !== "single") return;
    cs.setResult("running");
    setTimeout(() => {
      const { pass, feedback } = challenge.validate(cs.singleCode);
      cs.setResult(pass ? "pass" : "fail");
      cs.setSingleFeedback(feedback);
      if (pass) applyPatch(cs.type!, challenge.points);
    }, 700);
  }

  function submitTwoFile() {
    if (!cs.type || !challenge || challenge.kind !== "two-file") return;
    cs.setResult("running");
    setTimeout(() => {
      const results = Object.fromEntries(
        challenge.tabs.map((key) => [
          key,
          challenge.validate[key](cs.codes[key] ?? ""),
        ]),
      );
      cs.setFeedbacks(
        Object.fromEntries(challenge.tabs.map((k) => [k, results[k].feedback])),
      );
      cs.setFileOk(
        Object.fromEntries(challenge.tabs.map((k) => [k, results[k].pass])),
      );

      const allPass = challenge.tabs.every((k) => results[k].pass);
      if (allPass) {
        cs.setResult("pass");
        applyPatch(cs.type!, challenge.points);
      } else {
        cs.setResult("fail");
        const firstFailing = challenge.tabs.find((k) => !results[k].pass);
        if (firstFailing) cs.setActiveTab(firstFailing);
      }
    }, 700);
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const critCount = logs.filter(
    (l) => l.severity === "critical" && !patchedTypes.has(l.type),
  ).length;

  const unacknowledgedCount =
    logs.filter((l) => !l.detected && !patchedTypes.has(l.type)).length || undefined;

  const pendingInvestigateCount =
    Array.from(new Set(
      logs.filter((l) => l.detected && !patchedTypes.has(l.type)).map((l) => l.type),
    )).length || undefined;

  // ── Tab configuration ─────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: LucideIcon; badge?: number }[] = [
    {
      id: "logs",
      label: "Live Logs",
      icon: Activity,      // Replaces 📡
      badge: unacknowledgedCount
    },
    {
      id: "investigate",
      label: "Investigate",
      icon: Search,        // Replaces 🔍
      badge: pendingInvestigateCount
    },
    {
      id: "scan",
      label: "Vuln Scan",
      icon: ShieldCheck,   // Replaces 🛡️
    },
    {
      id: "tools",
      label: "Tools",
      icon: Wrench,        // Replaces 🔧
    },
    {
      id: "codebase",
      label: "Codebase",
      icon: FolderCode,    // Replaces 📁
    },
  ];

  // ── Auth screen ───────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans }}>
        <div style={{ width: 400, opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(12px)", transition: "all 0.5s" }}>

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(26,60,110,0.1)", border: "1px solid rgba(26,60,110,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <span style={{ fontSize: 24 }}>🛡️</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1a3c6e", marginBottom: 4 }}>
              Neobank <span style={{ color: "#f5820a" }}>Defense</span>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", fontFamily: mono, letterSpacing: ".08em" }}>
              BLUE TEAM CONSOLE LOGIN
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "28px 28px", boxShadow: "0 20px 50px rgba(0,0,0,0.05)" }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#6b7280", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8, fontFamily: mono }}>
              Access Password
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              placeholder="Enter team password"
              autoFocus
              style={{ width: "100%", background: "#f9fafb", border: `1.5px solid ${pwError ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, padding: "11px 14px", fontSize: 13, fontFamily: mono, color: "#374151", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
            />
            {pwError && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444", fontWeight: 600, fontFamily: mono }}>
                ✗ Incorrect password
              </div>
            )}
            <button
              onClick={handleAuth}
              style={{ marginTop: 16, width: "100%", background: "#1a3c6e", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer", letterSpacing: ".03em", fontFamily: sans, transition: "opacity 0.2s" }}
            >
              Enter Console →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main dashboard ────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh", height: "100vh",
      background: "#f5f7fa",
      fontFamily: sans, color: "#374151",
      display: "flex", flexDirection: "column",
      fontSize: 13, overflow: "hidden",
    }}>

      {/* Critical flash overlay */}
      {alertFlash && (
        <div style={{ position: "fixed", inset: 0, border: "3px solid #dc2626", pointerEvents: "none", zIndex: 9999, animation: "redflash 0.5s ease-out forwards" }} />
      )}

      {/* Challenge modal */}
      {cs.open && challenge && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          {challenge.kind === "two-file" ? (
            <TwoFileModal
              challenge={challenge}
              challengeType={cs.type!}
              challengeResult={cs.result}
              activeTab={cs.activeTab!}
              setActiveTab={cs.setActiveTab}
              codes={cs.codes}
              setCodes={cs.setCodes}
              feedbacks={cs.feedbacks}
              fileOk={cs.fileOk}
              showHint={cs.showHint}
              setShowHint={cs.setShowHint}
              patchedTypes={patchedTypes}
              onSubmit={submitTwoFile}
              onClose={cs.close}
            />
          ) : (
            <SingleModal
              challenge={challenge}
              challengeType={cs.type!}
              challengeResult={cs.result}
              code={cs.singleCode}
              setCode={cs.setSingleCode}
              feedback={cs.singleFeedback}
              showHint={cs.showHint}
              setShowHint={cs.setShowHint}
              patchedTypes={patchedTypes}
              onSubmit={submitSingle}
              onClose={cs.close}
            />
          )}
        </div>
      )}

      {/* ── TOP HEADER ────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 64,
        background: "#0f172a", // Slightly softer dark blue/slate
        borderBottom: "1px solid #1e293b",
        flexShrink: 0,
      }}>

        {/* Left: Branding & Status Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>

          {/* Brand / Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32,
              background: "rgba(245, 130, 10, 0.1)",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#f5820a" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f8fafc", lineHeight: 1.2 }}>
                Neobank <span style={{ color: "#f5820a", fontWeight: 700 }}>Defense</span>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: 2 }}>
                Blue Team Console
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: "#1e293b" }} />

          {/* Alert & Patch Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {critCount > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: 6, padding: "4px 10px",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.2s infinite" }} />
                <span style={{ fontSize: 11, color: "#fca5a5", fontWeight: 600, letterSpacing: ".02em" }}>
                  {critCount} CRITICAL
                </span>
              </div>
            )}

            {Array.from(patchedTypes).map((t) => (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(34, 197, 94, 0.1)",
                borderRadius: 6, padding: "4px 10px",
              }}>
                <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
                  ✓ {TYPE_LABELS[t].split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Score & Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>

          {/* Score */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: ".05em", marginBottom: 2 }}>
              TEAM SCORE
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: "#f8fafc",
              lineHeight: 1, fontFamily: mono,
            }}>
              {score.toLocaleString()}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setLogs([])}
              style={{
                fontFamily: sans, fontSize: 12, fontWeight: 500,
                padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                background: "transparent", border: "none",
                color: "#94a3b8", transition: "color 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "#f8fafc"}
              onMouseOut={(e) => e.currentTarget.style.color = "#94a3b8"}
            >
              Clear
            </button>
          </div>

        </div>
      </header>

      {/* ── SUB-NAV TAB BAR ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 32px", height: 56,
        background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              badge={tab.badge}
              isActive={isActive}
              onClick={() => setActiveTab(tab.id)}
            />
          );
        })}

        {/* Contextual tip */}
        {activeTab === "logs" && (
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            Click any log row → acknowledge it, then go to{" "}
            <strong style={{ color: "#94a3b8" }}>Investigate</strong> to view the code and patch
          </div>
        )}
        {activeTab === "investigate" && (
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            View full source files, then open the Patch IDE to fix the vulnerability and claim points
          </div>
        )}
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

        {activeTab === "logs" && (
          <LogsTab
            logs={logs}
            setLogs={setLogs}
            patchedTypes={patchedTypes}
            selectedLogId={selectedLogId}
            onSelect={(id) => setSelectedLogId((prev) => (prev === id ? null : id))}
            onDismissSelect={() => setSelectedLogId(null)}
            onAcknowledge={acknowledge}
            onGoInvestigate={() => setActiveTab("investigate")}
          />
        )}

        {activeTab === "investigate" && (
          <InvestigateTab
            logs={logs}
            patchedTypes={patchedTypes}
            onOpenPatch={openPatch}
          />
        )}

        {activeTab === "scan" && (
          <ScanTab
            patchedTypes={patchedTypes}
            onScanComplete={handleScanComplete}
          />
        )}

        {activeTab === "tools" && (
          <ToolsTab scoreHistory={scoreHistory} />
        )}

        {activeTab === "codebase" && <CodebaseTab />}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          padding: "12px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          zIndex: 9990, animation: "fadeup .2s ease",
          maxWidth: 380,
          ...(toast.ok
            ? { background: "rgba(74,222,128,.1)", border: "1px solid rgba(74,222,128,.25)", color: "#4ade80" }
            : { background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171" }),
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap");
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f7fa; overflow: hidden; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        button:focus { outline: none; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes fadeup { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        @keyframes redflash { 0% { opacity:1 } 100% { opacity:0 } }
        @keyframes ideIn { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

// ── TabButton subcomponent ────────────────────────────────────────────────────

function TabButton({
  id, label, icon: Icon, badge, isActive, onClick, // 1. Rename icon to Icon (capitalized)
}: {
  id: string;
  label: string;
  icon: LucideIcon; // 2. Update type from string to LucideIcon
  badge?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    // ... your existing styles ...
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: ".02em",
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
    border: "1px solid transparent",
    background: "transparent",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all .2s ease",
    boxShadow: "none",
  };

  const activeStyle: React.CSSProperties = {
    border: "1px solid rgba(245,130,10,0.3)",
    background: "rgba(245,130,10,0.08)",
    color: "#f5820a",
    boxShadow: "0 4px 12px rgba(245,130,10,0.05)",
  };

  const hoverStyle: React.CSSProperties = {
    color: "#cbd5e1",
    background: "rgba(255,255,255,0.03)",
  };

  const style: React.CSSProperties = {
    ...baseStyle,
    ...(isActive ? activeStyle : hovered ? hoverStyle : {}),
  };

  return (
    <button
      onClick={onClick}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 3. Render as a component instead of a string */}
      <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />

      {label}

      {badge !== undefined && badge > 0 && (
        <span style={{
          fontSize: 11,
          fontWeight: 800,
          borderRadius: 12,
          padding: "2px 8px",
          minWidth: 24,
          textAlign: "center",
          ...(isActive
            ? {
              background: "rgba(245,130,10,0.2)",
              color: "#f5820a",
              border: "1px solid rgba(245,130,10,0.3)",
            }
            : {
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.3)",
            }),
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}
