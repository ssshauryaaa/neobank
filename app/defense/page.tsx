"use client";

import React, { useState } from "react";
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
  useTimer,
  useToast,
  useChallengeState,
} from "@/hooks";
import {
  LogRow,
  ThreatInspector,
  ScoreLedger,
  TwoFileModal,
  SingleModal,
} from "../../components";
import { fmtElapsed } from "@/utils/format";

export default function DefensePage() {
  const [isRunning, setIsRunning] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "acknowledged" | "fixed">(
    "all",
  );
  const [score, setScore] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<
    { points: number; ts: number; detail: string; type: AttackType }[]
  >([]);
  const [patchedTypes, setPatchedTypes] = useState<Set<AttackType>>(new Set());

  const [toast, showToast] = useToast();
  const { logs, setLogs, alertFlash } = useAttackSimulator(
    patchedTypes,
    isRunning,
  );
  const elapsed = useTimer(isRunning);
  const cs = useChallengeState();

  const selectedLog = logs.find((l) => l.id === selected);
  const challenge = cs.type ? CHALLENGES[cs.type] : null;

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
    if (filterTab === "fixed") return isGP;
    return true;
  });

  const tabCounts = {
    all: logs.length,
    acknowledged: logs.filter((l) => l.detected && !patchedTypes.has(l.type))
      .length,
    fixed: logs.filter((l) => patchedTypes.has(l.type)).length,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f11",
        fontFamily: sans,
        color: "#e8e6e1",
        display: "flex",
        flexDirection: "column",
        fontSize: 13,
      }}
    >
      {/* Critical flash overlay */}
      {alertFlash && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            border: "2px solid #ef4444",
            pointerEvents: "none",
            zIndex: 9999,
            animation: "redflash 0.5s ease-out forwards",
          }}
        />
      )}

      {/* Challenge modal */}
      {cs.open && challenge && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(8px)",
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

      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          height: 58,
          background: "#111115",
          borderBottom: "1px solid #1e1e24",
          flexShrink: 0,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 20,
                height: 20,
                background: "linear-gradient(135deg,#4ade80,#22d3ee)",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  fill="white"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#f0ece4",
                letterSpacing: "-.02em",
              }}
            >
              BREACH<span style={{ color: "#4ade80" }}>@</span>TRIX
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#3a3a42",
                fontWeight: 500,
                marginLeft: 4,
              }}
            >
              // blue team console
            </span>
          </div>

          {/* Critical alert badge */}
          {critCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(239,68,68,.1)",
                border: "1px solid rgba(239,68,68,.25)",
                borderRadius: 6,
                padding: "3px 10px",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ef4444",
                  animation: "pulse 1.2s infinite",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "#ef4444",
                  fontWeight: 700,
                  letterSpacing: ".08em",
                }}
              >
                {critCount} CRITICAL ACTIVE
              </span>
            </div>
          )}

          {/* Patched type badges */}
          {[...patchedTypes].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(74,222,128,.08)",
                border: "1px solid rgba(74,222,128,.2)",
                borderRadius: 6,
                padding: "3px 10px",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#4ade80",
                  fontWeight: 700,
                  letterSpacing: ".06em",
                }}
              >
                ✓ {TYPE_LABELS[t].split(" ")[0]}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Score */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: "#3a3a42",
                fontWeight: 700,
                letterSpacing: ".1em",
                marginBottom: 1,
              }}
            >
              SCORE
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#4ade80",
                lineHeight: 1,
                letterSpacing: "-.03em",
                fontFamily: mono,
              }}
            >
              {score.toLocaleString()}
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "#1e1e24" }} />
          {/* Uptime */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: "#3a3a42",
                fontWeight: 700,
                letterSpacing: ".1em",
                marginBottom: 1,
              }}
            >
              UPTIME
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: isRunning ? "#e8e6e1" : "#3a3a42",
                lineHeight: 1,
                fontFamily: mono,
              }}
            >
              {fmtElapsed(elapsed)}
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "#1e1e24" }} />
          {/* Controls */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setLogs([])}
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".06em",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                background: "transparent",
                border: "1px solid #2a2a30",
                color: "#4a4a52",
              }}
            >
              CLEAR
            </button>
            <button
              onClick={() => setIsRunning((v) => !v)}
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".06em",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                ...(isRunning
                  ? {
                      background: "rgba(251,191,36,.1)",
                      border: "1px solid rgba(251,191,36,.25)",
                      color: "#fbbf24",
                    }
                  : {
                      background: "rgba(74,222,128,.1)",
                      border: "1px solid rgba(74,222,128,.25)",
                      color: "#4ade80",
                    }),
              }}
            >
              {isRunning ? "⏸ PAUSE" : "▶ RESUME"}
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          height: "calc(100vh - 58px)",
        }}
      >
        {/* ── Log list ─────────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #1e1e24",
            minWidth: 0,
          }}
        >
          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              borderBottom: "1px solid #1e1e24",
              background: "#111115",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 0 }}>
              {(["all", "acknowledged", "fixed"] as const).map((tab) => {
                const labels = {
                  all: "All Events",
                  acknowledged: "Acknowledged",
                  fixed: "Fixed",
                };
                const active = filterTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    style={{
                      fontFamily: sans,
                      background: "transparent",
                      border: "none",
                      borderBottom: `2px solid ${active ? "#4ade80" : "transparent"}`,
                      padding: "14px 18px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      color: active ? "#4ade80" : "#4a4a52",
                      cursor: "pointer",
                      transition: "all .15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    {labels[tab]}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 10,
                        background: active ? "rgba(74,222,128,.15)" : "#1e1e24",
                        color: active ? "#4ade80" : "#3a3a42",
                      }}
                    >
                      {tabCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".08em",
                color: isRunning ? "#4ade80" : "#4a4a52",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {isRunning && (
                <span
                  style={{
                    display: "inline-block",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#4ade80",
                    animation: "pulse 1.2s infinite",
                  }}
                />
              )}
              {isRunning ? "LIVE" : "PAUSED"}
            </span>
          </div>

          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "88px 82px 150px 1fr 110px",
              padding: "9px 24px",
              background: "#0d0d10",
              borderBottom: "1px solid #1e1e24",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".1em",
              color: "#3a3a42",
              flexShrink: 0,
            }}
          >
            <span>TIME</span>
            <span>SEV</span>
            <span>VECTOR</span>
            <span>ATTACKER / DETAIL</span>
            <span style={{ textAlign: "right" }}>STATUS</span>
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredLogs.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 32, color: "#2a2a30" }}>◎</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#3a3a42",
                    fontWeight: 600,
                    letterSpacing: ".06em",
                  }}
                >
                  {filterTab === "acknowledged"
                    ? "NO ACKNOWLEDGED THREATS"
                    : filterTab === "fixed"
                      ? "NO PATCHED VULNERABILITIES YET"
                      : "NO EVENTS RECORDED"}
                </div>
              </div>
            )}
            {filteredLogs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                isSelected={selected === log.id}
                patchedTypes={patchedTypes}
                onSelect={(id) =>
                  setSelected((prev) => (prev === id ? null : id))
                }
              />
            ))}
          </div>
        </div>

        {/* ── Right sidebar: Inspector + Ledger ────────────────────────────── */}
        <div
          style={{
            width: 420,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "#111115",
            borderLeft: "1px solid #1e1e24",
          }}
        >
          <div
            style={{
              padding: "14px 22px",
              borderBottom: "1px solid #1e1e24",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".12em",
                color: "#3a3a42",
              }}
            >
              THREAT INSPECTOR
            </span>
            {selectedLog && (
              <span
                style={{ fontSize: 10, color: "#4a4a52", fontFamily: mono }}
              >
                #{selectedLog.id}
              </span>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ThreatInspector
              selectedLog={selectedLog}
              patchedTypes={patchedTypes}
              toast={toast}
              onAcknowledge={acknowledge}
              onOpenPatch={openPatch}
            />
          </div>

          <ScoreLedger scoreHistory={scoreHistory} />
        </div>
      </div>

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap");
        * { box-sizing: border-box; }
        body { margin: 0; background: #09090b; font-family: 'IBM Plex Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #52525b; }
        textarea:focus, button:focus { outline: none; }
        textarea { caret-color: #3b82f6; }
        textarea::selection { background: rgba(59,130,246,0.2); }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeup { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
        @keyframes redflash { 0% { opacity:1 } 100% { opacity:0 } }
      `}</style>
    </div>
  );
}
