"use client";
import React, { useState } from "react";
import type { LogEntry, AttackType } from "@/types";
import { TYPE_LABELS, TYPE_COLORS, mono, sans } from "@/constants/theme";
import { CHALLENGES } from "@/challenges";

type Props = {
  logs: LogEntry[];
  patchedTypes: Set<AttackType>;
  onOpenPatch: (logId: string) => void;
};

export function InvestigateTab({ logs, patchedTypes, onOpenPatch }: Props) {
  const [selectedType, setSelectedType] = useState<AttackType | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Pending: detected but not yet patched (unique types)
  const pendingTypes = Array.from(
    new Set(
      logs
        .filter((l) => l.detected && !patchedTypes.has(l.type))
        .map((l) => l.type)
    )
  ) as AttackType[];

  // Patched types
  const patchedTypeList = Array.from(patchedTypes) as AttackType[];

  const selectedChallenge = selectedType ? CHALLENGES[selectedType] : null;
  const isPatched = selectedType ? patchedTypes.has(selectedType) : false;

  // Find first log id for this type (to open patch IDE)
  function getFirstLogId(type: AttackType): string | null {
    const found = logs.find((l) => l.type === type && l.detected);
    return found?.id ?? null;
  }

  function handleOpenPatch() {
    if (!selectedType) return;
    const logId = getFirstLogId(selectedType);
    if (logId) onOpenPatch(logId);
  }

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0, background: "#f5f7fa" }}>

      {/* ── LEFT: Investigation queue ─────────────────────────────────── */}
      <div style={{
        width: 340, flexShrink: 0,
        borderRight: "1px solid #e2e8f0",
        background: "#ffffff",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #e2e8f0",
          background: "#f9fafb", flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", color: "#6b7280" }}>
            INVESTIGATION QUEUE
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
            Acknowledged threats awaiting a patch
          </div>
        </div>

        <div style={{ flex: 1, padding: "12px 12px 20px" }}>

          {/* Pending section */}
          {pendingTypes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: ".1em",
                color: "#9ca3af", marginBottom: 8, padding: "0 4px",
              }}>
                ⚠️ NEEDS PATCH — {pendingTypes.length}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pendingTypes.map((type) => {
                  const tc = TYPE_COLORS[type];
                  const challenge = CHALLENGES[type];
                  const isActive = selectedType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => { setSelectedType(type); setShowHint(false); }}
                      style={{
                        fontFamily: sans, textAlign: "left", cursor: "pointer",
                        padding: "12px 14px", borderRadius: 10,
                        border: `1px solid ${isActive ? tc.border : "#e2e8f0"}`,
                        background: isActive ? tc.bg : "#fff",
                        boxShadow: isActive ? `0 2px 8px ${tc.border}` : "none",
                        transition: "all .15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
                          padding: "2px 7px", borderRadius: 4,
                          color: tc.text, background: tc.bg, border: `1px solid ${tc.border}`,
                        }}>
                          {TYPE_LABELS[type]}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#f5820a" }}>
                          +{challenge?.points ?? 0} pts
                        </span>
                      </div>
                      {challenge && (
                        <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>
                          {challenge.description.slice(0, 90)}…
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Patched section */}
          {patchedTypeList.length > 0 && (
            <div>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: ".1em",
                color: "#9ca3af", marginBottom: 8, padding: "0 4px",
              }}>
                ✅ PATCHED — {patchedTypeList.length}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {patchedTypeList.map((type) => {
                  const tc = TYPE_COLORS[type];
                  return (
                    <div key={type} style={{
                      padding: "9px 12px", borderRadius: 8, opacity: 0.7,
                      border: "1px solid rgba(74,222,128,0.2)",
                      background: "rgba(74,222,128,0.05)",
                      display: "flex", alignItems: "center", gap: 7,
                    }}>
                      <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>✓</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: tc.text, letterSpacing: ".05em",
                      }}>
                        {TYPE_LABELS[type]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {pendingTypes.length === 0 && patchedTypeList.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "40px 20px", gap: 12, textAlign: "center",
            }}>
              <div style={{ fontSize: 32 }}>🛡️</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: "#9ca3af" }}>
                NO THREATS ACKNOWLEDGED
              </div>
              <div style={{ fontSize: 11, color: "#d1d5db", lineHeight: 1.5 }}>
                Go to <strong style={{ color: "#94a3b8" }}>Live Logs</strong> and click a row to acknowledge it first
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail + patch panel ──────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowY: "auto" }}>
        {!selectedType ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14,
            color: "#9ca3af", textAlign: "center", padding: 40,
          }}>
            <div style={{ fontSize: 40 }}>🔍</div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "#9ca3af" }}>
              SELECT A THREAT TO INVESTIGATE
            </div>
            <div style={{ fontSize: 12, color: "#d1d5db", maxWidth: 280, lineHeight: 1.6 }}>
              Click a card on the left to view vulnerability details and open the Patch IDE
            </div>
          </div>
        ) : (
          <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Type header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: ".07em",
                    padding: "3px 10px", borderRadius: 5,
                    color: TYPE_COLORS[selectedType].text,
                    background: TYPE_COLORS[selectedType].bg,
                    border: `1px solid ${TYPE_COLORS[selectedType].border}`,
                  }}>
                    {TYPE_LABELS[selectedType]}
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", letterSpacing: "-.01em", lineHeight: 1.3, marginBottom: 8 }}>
                  {selectedChallenge?.title ?? TYPE_LABELS[selectedType]}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  {selectedChallenge?.description}
                </div>
              </div>
              {selectedChallenge && (
                <div style={{
                  flexShrink: 0, textAlign: "right",
                  background: "rgba(245,130,10,0.06)", border: "1px solid rgba(245,130,10,0.2)",
                  borderRadius: 10, padding: "10px 16px",
                }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: ".1em", marginBottom: 2 }}>PATCH REWARD</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f5820a", fontFamily: mono }}>+{selectedChallenge.points}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>pts</div>
                </div>
              )}
            </div>

            {/* Vulnerable snippet */}
            {selectedChallenge && (
              <div style={{ background: "#0f172a", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{
                  padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".12em", color: "#ef4444" }}>⛔ VULNERABLE SNIPPET</span>
                </div>
                <div style={{ padding: "14px 18px", fontFamily: mono, fontSize: 12, lineHeight: 1.8, color: "#f87171", overflowX: "auto" }}>
                  {selectedChallenge.kind === "two-file"
                    ? Object.values(selectedChallenge.tabLabels)[0]
                    : "Single-file challenge"}
                  <br />
                  <span style={{ color: "#6b7280" }}>
                    {selectedChallenge.kind === "two-file"
                      ? `// File: ${Object.values(selectedChallenge.tabLabels)[0]}\n// Open the Patch IDE to see the full vulnerable source`
                      : `// Fix the vulnerable pattern — open the Patch IDE to edit`}
                  </span>
                </div>
              </div>
            )}

            {/* Fix hint toggle */}
            {selectedChallenge && (
              <div>
                <button
                  onClick={() => setShowHint((v) => !v)}
                  style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    padding: "8px 16px", borderRadius: 8,
                    background: showHint ? "rgba(245,130,10,0.08)" : "rgba(255,255,255,0.5)",
                    border: `1px solid ${showHint ? "rgba(245,130,10,0.3)" : "#e2e8f0"}`,
                    color: showHint ? "#f5820a" : "#64748b",
                    transition: "all .15s",
                  }}
                >
                  💡 {showHint ? "Hide Fix Hint" : "Show Fix Hint"}
                </button>

                {showHint && (
                  <div style={{
                    marginTop: 12, padding: 16,
                    background: "rgba(245,130,10,0.04)", border: "1px solid rgba(245,130,10,0.15)",
                    borderRadius: 10, animation: "fadeup .15s ease",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#f5820a", letterSpacing: ".08em", marginBottom: 8 }}>
                      FIX HINTS
                    </div>
                    {selectedChallenge.kind === "single"
                      ? selectedChallenge.hints.map((hint, i) => (
                          <div key={i} style={{ fontSize: 12, color: "#64748b", marginBottom: 6, lineHeight: 1.5 }}>
                            {hint}
                          </div>
                        ))
                      : Object.entries(selectedChallenge.hints).map(([tab, hints]) => (
                          <div key={tab} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".08em", marginBottom: 4 }}>
                              {selectedChallenge.kind === "two-file" ? selectedChallenge.tabLabels[tab] : tab}
                            </div>
                            {hints.map((h, i) => (
                              <div key={i} style={{ fontSize: 12, color: "#64748b", marginBottom: 4, lineHeight: 1.5 }}>{h}</div>
                            ))}
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            )}

            {/* Action / status */}
            {isPatched ? (
              <div style={{
                padding: "16px 20px", borderRadius: 10,
                background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>Vulnerability Patched</div>
                  <div style={{ fontSize: 12, color: "#4a6a52", marginTop: 2 }}>
                    {TYPE_LABELS[selectedType]} has been globally closed. Points awarded.
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleOpenPatch}
                style={{
                  fontFamily: sans, fontSize: 14, fontWeight: 800, cursor: "pointer",
                  padding: "14px 24px", borderRadius: 10,
                  background: "linear-gradient(135deg, #f5820a, #d97706)",
                  border: "none", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: "0 4px 20px rgba(245,130,10,0.3)",
                  transition: "all .15s",
                  letterSpacing: ".02em",
                }}
              >
                ⚡ Open Patch IDE — Fix the Code
                {selectedChallenge && (
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 10px",
                  }}>
                    +{selectedChallenge.points} pts
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
