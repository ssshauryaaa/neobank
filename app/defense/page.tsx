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
  useAttackSimulator,
  useToast,
  useChallengeState,
} from "@/hooks";
import {
  LogRow,
  ThreatInspector,
  ScoreLedger,
  TwoFileModal,
  SingleModal,
  VulnerabilityScanner,
} from "../../components";

export default function DefensePage() {
  const [isRunning, setIsRunning] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "acknowledged" | "patched">(
    "all",
  );
  const [score, setScore] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<
    { points: number; ts: number; detail: string; type: AttackType }[]
  >([]);
  const [patchedTypes, setPatchedTypes] = useState<Set<AttackType>>(new Set());
  const [scanOpen, setScanOpen] = useState(false);
  const [scanUsed, setScanUsed] = useState(false);

  const [toast, showToast] = useToast();
  const { logs, setLogs, alertFlash } = useAttackSimulator(
    patchedTypes,
    isRunning,
  );
  const cs = useChallengeState();

  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { 
    setMounted(true);
    if (typeof window !== "undefined") {
      setScanUsed(!!localStorage.getItem("neobank_scan_startTs"));
    }
  }, []);

  function handleAuth() {
    if (pw === "defending") {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPw("");
    }
  }

  const selectedLog = logs.find((l) => l.id === selected);
  const challenge = cs.type ? CHALLENGES[cs.type] : null;

  // ── Scanner application ───────────────────────────────────────────────────

  function handleScanComplete(pts: number) {
    setScore((s) => s + pts);
    setScoreHistory((h) => [
      { points: pts, ts: Date.now(), detail: "Active vulnerability scan completed", type: "xss" as AttackType },
      ...h,
    ].slice(0, 30));
    showToast(`🔍 Scan complete — ${pts} bonus pts awarded!`);
  }

  function openScanner() {
    setScanUsed(true);
    setScanOpen(true);
  }

  // ── Patch application ─────────────────────────────────────────────────────

  function applyPatch(type: AttackType, points: number) {
    setLogs((prev) =>
      prev.map((l) => (l.type === type ? { ...l, patched: true } : l)),
    );
    setPatchedTypes((prev) => new Set([...prev, type]));

    const lsKey = PATCH_KEYS[type];
    if (lsKey) localStorage.setItem(lsKey, "1");

    const apiTarget = PATCH_TARGET_MAP[type];
    if (apiTarget) {
      fetch("/api/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: apiTarget, action: "apply" }),
      }).catch(() => {});
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
    showToast("Threat acknowledged — now deploy a hotfix to score");
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

  // ── Derived display values ────────────────────────────────────────────────

  const critCount = logs.filter(
    (l) => l.severity === "critical" && !patchedTypes.has(l.type),
  ).length;

  const filteredLogs = logs.filter((l) => {
    const isGP = patchedTypes.has(l.type);
    if (filterTab === "acknowledged") return l.detected && !isGP;
    if (filterTab === "patched") return isGP;
    return true;
  });

  const tabCounts = {
    all: logs.length,
    acknowledged: logs.filter((l) => l.detected && !patchedTypes.has(l.type))
      .length,
    patched: logs.filter((l) => patchedTypes.has(l.type)).length,
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
              onChange={e => { setPw(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && handleAuth()}
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

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", fontFamily: sans, color: "#374151", display: "flex", flexDirection: "column", fontSize: 13 }}>

      {/* Critical flash overlay */}
      {alertFlash && (
        <div style={{ position: "fixed", inset: 0, border: "3px solid #dc2626", pointerEvents: "none", zIndex: 9999, animation: "redflash 0.5s ease-out forwards" }} />
      )}

      {/* Challenge modal */}
      {cs.open && challenge && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
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
        padding: "0 28px", height: 60,
        background: "#1a3c6e", flexShrink: 0, gap: 16,
      }}>
        {/* Left: branding + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "rgba(245,130,10,0.2)", border: "1px solid rgba(245,130,10,0.4)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#f5820a" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff", letterSpacing: "-.01em" }}>
                Neobank <span style={{ color: "#f5820a" }}>Defense</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Blue Team Console · Breach@trix</div>
            </div>
          </div>

          {/* Critical alert badge */}
          {critCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.35)", borderRadius: 6, padding: "3px 10px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.2s infinite" }} />
              <span style={{ fontSize: 10, color: "#fca5a5", fontWeight: 700, letterSpacing: ".08em" }}>{critCount} CRITICAL ACTIVE</span>
            </div>
          )}

          {/* Patched type badges */}
          {[...patchedTypes].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(245,130,10,0.15)", border: "1px solid rgba(245,130,10,0.3)", borderRadius: 6, padding: "3px 10px" }}>
              <span style={{ fontSize: 10, color: "#f5820a", fontWeight: 700, letterSpacing: ".06em" }}>✓ {TYPE_LABELS[t].split(" ")[0]}</span>
            </div>
          ))}
        </div>

        {/* Right: score + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: ".1em", marginBottom: 1 }}>BLUE TEAM SCORE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f5820a", lineHeight: 1, letterSpacing: "-.03em", fontFamily: mono }}>{score.toLocaleString()}</div>
          </div>

          <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={scanUsed ? () => setScanOpen(true) : openScanner}
              title={scanUsed ? "View scan results" : "Run one-time vulnerability scan (2 min)"}
              style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", padding: "6px 14px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: scanUsed ? "rgba(96,165,250,0.15)" : "rgba(245,130,10,0.15)", border: `1px solid ${scanUsed ? "rgba(96,165,250,0.4)" : "rgba(245,130,10,0.4)"}`, color: scanUsed ? "#93c5fd" : "#f5820a" }}
            >
              🔍 {scanUsed ? "VIEW SCAN" : "RUN SCAN"}
              {!scanUsed && <span style={{ fontSize: 9, background: "rgba(245,130,10,0.2)", border: "1px solid rgba(245,130,10,0.3)", padding: "1px 5px", borderRadius: 3, letterSpacing: ".06em" }}>1× USE</span>}
            </button>
            <button onClick={() => setLogs([])} style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", padding: "6px 12px", borderRadius: 6, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}>CLEAR</button>
            <button onClick={() => setIsRunning(v => !v)} style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", padding: "6px 14px", borderRadius: 6, cursor: "pointer", ...(isRunning ? { background: "rgba(245,130,10,0.15)", border: "1px solid rgba(245,130,10,0.4)", color: "#f5820a" } : { background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.4)", color: "#4ade80" }) }}>
              {isRunning ? "⏸ PAUSE" : "▶ RESUME"}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, height: "calc(100vh - 60px)" }}>

        {/* Log list (left) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #e2e8f0", minWidth: 0 }}>

          {/* Filter tabs */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", flexShrink: 0 }}>
            <div style={{ display: "flex" }}>
              {(["all", "acknowledged", "patched"] as const).map(tab => {
                const labels = { all: "All Events", acknowledged: "Acknowledged", patched: "Patched" };
                const active = filterTab === tab;
                return (
                  <button key={tab} onClick={() => setFilterTab(tab)} style={{
                    fontFamily: sans, background: "transparent", border: "none",
                    borderBottom: `2px solid ${active ? "#1a3c6e" : "transparent"}`,
                    padding: "14px 18px", fontSize: 11, fontWeight: 700, letterSpacing: ".07em",
                    color: active ? "#1a3c6e" : "#9ca3af", cursor: "pointer", transition: "all .15s",
                    display: "flex", alignItems: "center", gap: 7,
                  }}>
                    {labels[tab]}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: active ? "rgba(26,60,110,0.1)" : "#f3f4f6", color: active ? "#1a3c6e" : "#9ca3af" }}>
                      {tabCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: isRunning ? "#16a34a" : "#9ca3af", display: "flex", alignItems: "center", gap: 5 }}>
              {isRunning && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#16a34a", animation: "pulse 1.2s infinite" }} />}
              {isRunning ? "LIVE MONITORING" : "PAUSED"}
            </span>
          </div>

          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "80px 90px 180px 1fr 110px",
            padding: "9px 24px", background: "#f9fafb", borderBottom: "1px solid #e2e8f0",
            fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: "#9ca3af", flexShrink: 0,
          }}>
            <span>TIME</span><span>SEVERITY</span><span>ATTACK TYPE</span><span>ATTACKER / DETAIL</span><span style={{ textAlign: "right" }}>STATUS</span>
          </div>

          {/* Log rows */}
          <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
            {filteredLogs.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 10 }}>
                <div style={{ fontSize: 28, color: "#e5e7eb" }}>◎</div>
                <div style={{ fontSize: 12, color: "#d1d5db", fontWeight: 600, letterSpacing: ".06em", fontFamily: sans }}>
                  {filterTab === "acknowledged" ? "NO ACKNOWLEDGED THREATS" : filterTab === "patched" ? "NO PATCHED VULNS YET" : "NO EVENTS YET"}
                </div>
              </div>
            )}
            {filteredLogs.map(log => (
              <LogRow key={log.id} log={log} isSelected={selected === log.id} patchedTypes={patchedTypes} onSelect={id => setSelected(prev => prev === id ? null : id)} />
            ))}
          </div>
        </div>

        {/* Right sidebar: Inspector + Ledger */}
        <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", background: "#ffffff", borderLeft: "1px solid #e2e8f0" }}>
          <div style={{ padding: "14px 22px", borderBottom: "1px solid #e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", color: "#6b7280" }}>THREAT INSPECTOR</span>
            {selectedLog && <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: mono }}>#{selectedLog.id}</span>}
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <ThreatInspector selectedLog={selectedLog} patchedTypes={patchedTypes} toast={toast} onAcknowledge={acknowledge} onOpenPatch={openPatch} />
          </div>
          <ScoreLedger scoreHistory={scoreHistory} />
        </div>
      </div>

      {/* Vulnerability Scanner modal */}
      {scanOpen && (
        <VulnerabilityScanner
          patchedTypes={patchedTypes}
          onClose={() => setScanOpen(false)}
          onScanComplete={handleScanComplete}
        />
      )}

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap");
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f7fa; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        button:focus { outline: none; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes fadeup { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        @keyframes redflash { 0% { opacity:1 } 100% { opacity:0 } }
      `}</style>
    </div>
  );
}
