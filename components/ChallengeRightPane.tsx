import React from "react";
import type { AttackType, Challenge, ChallengeResult } from "../types";
import { C, mono, sans, TYPE_LABELS, TYPE_COLORS } from "../constants/theme";
import { CHALLENGES } from "../challenges";

type FileStatus = {
  key: string;
  label: string;
  ok: boolean;
  fb: string;
  dot: string;
};

type Props = {
  challenge: Challenge;
  challengeType: AttackType;
  fileStatuses: FileStatus[];
  challengeResult: ChallengeResult;
  singleFeedback: string;
  patchedTypes: Set<AttackType>;
  onSubmit: () => void;
};

export function ChallengeRightPane({
  challenge,
  challengeType,
  fileStatuses,
  challengeResult,
  singleFeedback,
  patchedTypes,
  onSubmit,
}: Props) {
  const isPassed = challengeResult === "pass";
  const isRunning = challengeResult === "running";

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: `1px solid ${C.border}`,
        background: C.bg1,
      }}
    >
      {/* ── Submit button ── */}
      <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
        <button
          onClick={onSubmit}
          disabled={isRunning || isPassed}
          style={{
            fontFamily: sans,
            width: "100%",
            padding: "12px 0",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            border: "1px solid transparent",
            cursor: isPassed ? "default" : isRunning ? "wait" : "pointer",
            transition: "all .15s ease",
            background: isPassed ? C.greenDim : isRunning ? C.bg3 : C.text0,
            color: isPassed ? C.green : isRunning ? C.text2 : C.bg0,
            borderColor: isPassed ? C.greenBorder : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isRunning
            ? "Validating..."
            : isPassed
              ? "✓ System Secured"
              : "Deploy Hotfix"}
        </button>

        {/* Single-snippet feedback */}
        {challenge.kind === "single" && singleFeedback && (
          <div
            style={{
              marginTop: 12,
              padding: "11px 14px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.65,
              ...(isPassed
                ? {
                    background: C.greenDim,
                    border: `1px solid ${C.greenBorder}`,
                    color: C.green,
                  }
                : {
                    background: C.redDim,
                    border: "1px solid rgba(248,113,113,0.25)",
                    color: C.red,
                  }),
            }}
          >
            {singleFeedback}
          </div>
        )}

        {/* Two-file status cards */}
        {challenge.kind === "two-file" && fileStatuses.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 14,
            }}
          >
            {fileStatuses.map((f) => (
              <div
                key={f.key}
                style={{
                  background: C.bg0,
                  borderRadius: 8,
                  padding: "10px 13px",
                  border: `1px solid ${f.ok ? C.greenBorder : f.fb ? "rgba(248,113,113,0.2)" : C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: f.dot,
                    }}
                  />
                  <span
                    style={{ fontSize: 12, color: C.text1, fontFamily: mono }}
                  >
                    {f.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".05em",
                    padding: "2px 8px",
                    borderRadius: 4,
                    color: f.ok ? C.green : f.fb ? C.red : C.text3,
                    background: f.ok ? C.greenDim : f.fb ? C.redDim : C.bg3,
                  }}
                >
                  {f.ok ? "fixed" : f.fb ? "needs fix" : "pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: C.border, margin: "18px 0 0" }} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Passed banner */}
        {isPassed && (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              marginBottom: 20,
              background: C.greenDim,
              border: `1px solid ${C.greenBorder}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.green,
                letterSpacing: ".06em",
                marginBottom: 5,
              }}
            >
              ✓ VULNERABILITY CLOSED
            </div>
            <div style={{ fontSize: 12, color: "#86efac", lineHeight: 1.6 }}>
              {TYPE_LABELS[challengeType]} attacks halted.
            </div>
          </div>
        )}

        {/* Effects list */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".12em",
            color: C.text3,
            marginBottom: 14,
          }}
        >
          ON PASS — EFFECTS
        </div>
        {[
          {
            icon: "🛡",
            text: (
              <>
                {"All "}
                <strong style={{ color: C.text1 }}>
                  {TYPE_LABELS[challengeType]}
                </strong>
                {" logs marked fixed"}
              </>
            ),
          },
          { icon: "⛔", text: "New attacks of this type stop spawning" },
          {
            icon: "⭐",
            text: (
              <>
                <strong style={{ color: C.green }}>
                  +{challenge.points} pts
                </strong>
                {" added to your score"}
              </>
            ),
          },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 11,
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: C.bg3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 12,
              }}
            >
              {item.icon}
            </div>
            <span
              style={{
                fontSize: 12,
                color: C.text2,
                lineHeight: 1.55,
                paddingTop: 3,
              }}
            >
              {item.text}
            </span>
          </div>
        ))}

        {/* Challenge board */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".12em",
              color: C.text3,
              marginBottom: 12,
            }}
          >
            CHALLENGE BOARD
          </div>
          {Object.entries(CHALLENGES).map(([type, c]) => {
            const done = patchedTypes.has(type as AttackType);
            const tc = TYPE_COLORS[type as AttackType];
            const isCurrent = type === challengeType;
            return (
              <div
                key={type}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: `1px solid ${C.border}`,
                  opacity: done && !isCurrent ? 0.4 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {done && (
                    <span style={{ fontSize: 10, color: C.green }}>✓</span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: done ? C.green : isCurrent ? tc.text : C.text2,
                    }}
                  >
                    {TYPE_LABELS[type as AttackType]}
                  </span>
                  {isCurrent && !done && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 3,
                        background: "rgba(74,222,128,0.1)",
                        color: C.green,
                        letterSpacing: ".06em",
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: mono,
                    color: done ? C.green : C.text3,
                  }}
                >
                  +{c!.points}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
