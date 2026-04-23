import React, { useState } from "react";
import type { LogEntry, AttackType } from "../types";
import {
  SEV_CONFIG,
  TYPE_LABELS,
  TYPE_COLORS,
  C,
  mono,
  sans,
} from "../constants/theme";
import { CHALLENGES } from "../challenges";

// ── ActionButton ──────────────────────────────────────────────────────────────

type ActionButtonProps = {
  label: string;
  sub: string;
  icon: string;
  active: boolean;
  done: boolean;
  points?: number;
  onClick: () => void;
};

function ActionButton({
  label,
  sub,
  icon,
  active,
  done,
  points,
  onClick,
}: ActionButtonProps) {
  const [hovered, setHovered] = useState(false);

  const base = done
    ? {
        bg: "rgba(74,222,128,.05)",
        border: "rgba(74,222,128,.15)",
        color: "#4a6a52",
        subColor: "#3a5a42",
      }
    : active && points
      ? {
          bg: "rgba(74,222,128,.1)",
          border: "rgba(74,222,128,.3)",
          color: "#4ade80",
          subColor: "#15803d",
        }
      : active
        ? {
            bg: "rgba(56,189,248,.08)",
            border: "rgba(56,189,248,.25)",
            color: "#38bdf8",
            subColor: "#1a6080",
          }
        : {
            bg: "#0d0d10",
            border: "#1e1e24",
            color: "#3a3a42",
            subColor: "#2a2a30",
          };

  return (
    <button
      onClick={onClick}
      disabled={!active}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{
        fontFamily: sans,
        width: "100%",
        padding: "13px 16px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".04em",
        cursor: active ? "pointer" : "not-allowed",
        border: `1px solid ${base.border}`,
        background: hovered && active ? base.bg + "bb" : base.bg,
        color: base.color,
        transition: "all .15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <div style={{ textAlign: "left" }}>
          <div>{label}</div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 400,
              color: base.subColor,
              marginTop: 1,
            }}
          >
            {sub}
          </div>
        </div>
      </div>
      {points && active && (
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>
            +{points}
          </span>
          <div style={{ fontSize: 9, color: "#15803d" }}>pts</div>
        </div>
      )}
    </button>
  );
}

// ── ThreatInspector ───────────────────────────────────────────────────────────

type Props = {
  selectedLog: LogEntry | undefined;
  patchedTypes: Set<AttackType>;
  toast: { msg: string; ok: boolean } | null;
  onAcknowledge: (id: string) => void;
  onOpenPatch: (id: string) => void;
};

export function ThreatInspector({
  selectedLog,
  patchedTypes,
  toast,
  onAcknowledge,
  onOpenPatch,
}: Props) {
  if (!selectedLog) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 12,
          color: "#2a2a30",
          textAlign: "center",
          padding: 32,
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          style={{ opacity: 0.3 }}
        >
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke="#e8e6e1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2" stroke="#e8e6e1" strokeWidth="1.5" />
        </svg>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".1em",
            color: "#2a2a30",
          }}
        >
          SELECT A THREAT
        </div>
        <div style={{ fontSize: 11, color: "#2a2a30" }}>
          Click any log row to inspect
        </div>
      </div>
    );
  }

  const sev = SEV_CONFIG[selectedLog.severity];
  const tc = TYPE_COLORS[selectedLog.type];
  const isGP = patchedTypes.has(selectedLog.type);
  const canAck = !selectedLog.detected && !isGP;
  const canPatch = selectedLog.detected && !isGP;

  return (
    <div
      style={{
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Threat card */}
      <div
        style={{
          background: "#16161a",
          border: `1px solid ${sev.dot}22`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${sev.dot}, transparent)`,
          }}
        />
        <div style={{ padding: "16px 18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".08em",
                padding: "2px 8px",
                borderRadius: 4,
                color: tc.text,
                background: tc.bg,
                border: `1px solid ${tc.border}`,
              }}
            >
              {TYPE_LABELS[selectedLog.type]}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: sev.dot,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: sev.color,
                  letterSpacing: ".06em",
                }}
              >
                {sev.label}
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: sev.color,
              marginBottom: 6,
              letterSpacing: "-.01em",
            }}
          >
            {selectedLog.user}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#8b8480",
              lineHeight: 1.65,
              marginBottom: 14,
            }}
          >
            {selectedLog.detail}
          </div>

          {/* Metadata grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              background: "#0d0d10",
              borderRadius: 7,
              padding: 12,
              marginBottom: 12,
            }}
          >
            {[
              ["SOURCE IP", selectedLog.ip],
              ["COUNTRY", selectedLog.country],
              ["ENDPOINT", selectedLog.endpoint],
              ["METHOD", selectedLog.method],
              ["PORT", String(selectedLog.port)],
              ["STATUS", String(selectedLog.statusCode)],
            ].map(([l, v]) => (
              <div key={l}>
                <div
                  style={{
                    fontSize: 9,
                    color: "#3a3a42",
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    marginBottom: 3,
                  }}
                >
                  {l}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#a0998f",
                    wordBreak: "break-all",
                    fontFamily: l === "SOURCE IP" ? mono : sans,
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: 9,
              color: "#3a3a42",
              fontWeight: 700,
              letterSpacing: ".08em",
              marginBottom: 5,
            }}
          >
            RAW PAYLOAD
          </div>
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid #1e1e24",
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 11,
              color: "#6b6b70",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              lineHeight: 1.7,
              fontFamily: mono,
              maxHeight: 90,
              overflowY: "auto",
            }}
          >
            {selectedLog.payload}
          </div>
        </div>
      </div>

      {/* Actions */}
      {isGP ? (
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(74,222,128,.06)",
            border: "1px solid rgba(74,222,128,.18)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              background: "rgba(74,222,128,.15)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, color: "#4ade80" }}>✓</span>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#4ade80",
                marginBottom: 2,
              }}
            >
              Vulnerability Patched
            </div>
            <div style={{ fontSize: 11, color: "#4a6a52" }}>
              {TYPE_LABELS[selectedLog.type]} is globally closed.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ActionButton
            label={selectedLog.detected ? "Acknowledged" : "Acknowledge Threat"}
            sub={
              selectedLog.detected
                ? "Step 1 complete — proceed to hotfix"
                : "Mark as triaged to unlock hotfix"
            }
            icon={selectedLog.detected ? "✓" : "◉"}
            active={canAck}
            done={selectedLog.detected}
            onClick={() => onAcknowledge(selectedLog.id)}
          />
          <ActionButton
            label="Deploy Hotfix"
            sub={
              canPatch
                ? "Opens code editor — fix the vulnerability"
                : "Acknowledge threat first"
            }
            icon={canPatch ? "⚡" : "⟳"}
            active={canPatch}
            done={false}
            onClick={() => onOpenPatch(selectedLog.id)}
            points={CHALLENGES[selectedLog.type]?.points}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            animation: "fadeup .2s ease",
            ...(toast.ok
              ? {
                  background: "rgba(74,222,128,.08)",
                  border: "1px solid rgba(74,222,128,.2)",
                  color: "#4ade80",
                }
              : {
                  background: "rgba(239,68,68,.08)",
                  border: "1px solid rgba(239,68,68,.2)",
                  color: "#f87171",
                }),
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* User Agent */}
      <div>
        <div
          style={{
            fontSize: 9,
            color: "#2a2a30",
            fontWeight: 700,
            letterSpacing: ".1em",
            marginBottom: 5,
          }}
        >
          USER AGENT
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#4a4a52",
            fontFamily: mono,
            lineHeight: 1.6,
            wordBreak: "break-all",
          }}
        >
          {selectedLog.userAgent}
        </div>
      </div>
    </div>
  );
}
