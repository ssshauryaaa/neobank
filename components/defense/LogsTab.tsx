"use client";
import React, { useState } from "react";
import type { LogEntry, AttackType } from "@/types";
import { SEV_CONFIG, TYPE_LABELS, TYPE_COLORS, mono, sans } from "@/constants/theme";
import { LogRow } from "@/components/LogRow";

type FilterTab = "all" | "acknowledged" | "patched";

type Props = {
  logs: LogEntry[];
  setLogs: (fn: (prev: LogEntry[]) => LogEntry[]) => void;
  patchedTypes: Set<AttackType>;
  selectedLogId: string | null;
  onSelect: (id: string) => void;
  onDismissSelect: () => void;
  onAcknowledge: (id: string) => void;
  onGoInvestigate: () => void;
};

export function LogsTab({
  logs,
  patchedTypes,
  selectedLogId,
  onSelect,
  onDismissSelect,
  onAcknowledge,
  onGoInvestigate,
}: Props) {
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const tabCounts = {
    all: logs.length,
    acknowledged: logs.filter((l) => l.detected && !patchedTypes.has(l.type)).length,
    patched: logs.filter((l) => patchedTypes.has(l.type)).length,
  };

  const filteredLogs = logs.filter((l) => {
    const isGP = patchedTypes.has(l.type);
    if (filterTab === "acknowledged") return l.detected && !isGP;
    if (filterTab === "patched") return isGP;
    return true;
  });

  const selectedLog = logs.find((l) => l.id === selectedLogId);

  const tabLabels = { all: "All Events", acknowledged: "Acknowledged", patched: "Patched" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

      {/* ── Filter row ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", borderBottom: "1px solid #e2e8f0",
        background: "#ffffff", flexShrink: 0,
      }}>
        <div style={{ display: "flex" }}>
          {(["all", "acknowledged", "patched"] as const).map((tab) => {
            const active = filterTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                style={{
                  fontFamily: sans, background: "transparent", border: "none",
                  borderBottom: `2px solid ${active ? "#1a3c6e" : "transparent"}`,
                  padding: "14px 18px", fontSize: 11, fontWeight: 700, letterSpacing: ".07em",
                  color: active ? "#1a3c6e" : "#9ca3af", cursor: "pointer", transition: "all .15s",
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                {tabLabels[tab]}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                  background: active ? "rgba(26,60,110,0.1)" : "#f3f4f6",
                  color: active ? "#1a3c6e" : "#9ca3af",
                }}>
                  {tabCounts[tab]}
                </span>
              </button>
            );
          })}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: ".08em",
          color: "#16a34a",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{
            display: "inline-block", width: 5, height: 5, borderRadius: "50%",
            background: "#16a34a", animation: "pulse 1.2s infinite",
          }} />
          LIVE MONITORING
        </span>
      </div>

      {/* ── Selected log mini-inspector bar ────────────────────────────── */}
      {selectedLog && (() => {
        const isPatched = patchedTypes.has(selectedLog.type);
        const tc = TYPE_COLORS[selectedLog.type];
        return (
          <div style={{
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            gap: 12,
            animation: "fadeup .15s ease",
          }}>
            {/* Left: log summary */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
                padding: "2px 8px", borderRadius: 4,
                color: tc.text, background: tc.bg, border: `1px solid ${tc.border}`,
                flexShrink: 0,
              }}>
                {TYPE_LABELS[selectedLog.type]}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a3c6e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedLog.user} — {selectedLog.detail}
              </span>
              <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: mono, flexShrink: 0 }}>
                {selectedLog.ip} → {selectedLog.endpoint}
              </span>
            </div>

            {/* Right: action */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {isPatched ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>✓ PATCHED</span>
              ) : !selectedLog.detected ? (
                <button
                  onClick={() => onAcknowledge(selectedLog.id)}
                  style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    padding: "6px 14px", borderRadius: 7,
                    background: "rgba(26,60,110,0.08)", border: "1px solid rgba(26,60,110,0.2)",
                    color: "#1a3c6e",
                  }}
                >
                  ◉ Acknowledge
                </button>
              ) : (
                <button
                  onClick={onGoInvestigate}
                  style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    padding: "6px 14px", borderRadius: 7,
                    background: "rgba(245,130,10,0.08)", border: "1px solid rgba(245,130,10,0.3)",
                    color: "#f5820a",
                  }}
                >
                  ⚡ Investigate & Patch →
                </button>
              )}
              <button
                onClick={onDismissSelect}
                style={{
                  fontFamily: sans, fontSize: 16, fontWeight: 400, lineHeight: 1,
                  padding: "2px 8px", borderRadius: 6, cursor: "pointer",
                  background: "transparent", border: "1px solid #e2e8f0", color: "#9ca3af",
                }}
              >
                ×
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Column headers ──────────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "80px 90px 180px 1fr 110px",
        padding: "9px 24px", background: "#f9fafb", borderBottom: "1px solid #e2e8f0",
        fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: "#9ca3af", flexShrink: 0,
      }}>
        <span>TIME</span>
        <span>SEVERITY</span>
        <span>ATTACK TYPE</span>
        <span>ATTACKER / DETAIL</span>
        <span style={{ textAlign: "right" }}>STATUS</span>
      </div>

      {/* ── Log rows ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", background: "#ffffff" }}>
        {filteredLogs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 10 }}>
            <div style={{ fontSize: 28, color: "#e5e7eb" }}>◎</div>
            <div style={{ fontSize: 12, color: "#d1d5db", fontWeight: 600, letterSpacing: ".06em", fontFamily: sans }}>
              {filterTab === "acknowledged"
                ? "NO ACKNOWLEDGED THREATS"
                : filterTab === "patched"
                  ? "NO PATCHED VULNS YET"
                  : "NO EVENTS YET"}
            </div>
          </div>
        )}
        {filteredLogs.map((log) => (
          <LogRow
            key={log.id}
            log={log}
            isSelected={selectedLogId === log.id}
            patchedTypes={patchedTypes}
            onSelect={(id) => onSelect(id)}
          />
        ))}
      </div>
    </div>
  );
}
