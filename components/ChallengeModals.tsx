import React from "react";
import type {
  AttackType,
  TwoFileChallenge,
  SingleChallenge,
  ChallengeResult,
} from "../types";
import { C, mono, sans, TYPE_LABELS, TYPE_COLORS } from "../constants/theme";
import { HintPanel } from "./HintPanel";
import { DiffView } from "./DiffView";
import { ChallengeRightPane } from "./ChallengeRightPane";

// ─── TwoFileModal ─────────────────────────────────────────────────────────────

type TwoFileProps = {
  challenge: TwoFileChallenge;
  challengeType: AttackType;
  challengeResult: ChallengeResult;
  activeTab: string;
  setActiveTab: (t: string) => void;
  codes: Record<string, string>;
  setCodes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  feedbacks: Record<string, string>;
  fileOk: Record<string, boolean>;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  patchedTypes: Set<AttackType>;
  onSubmit: () => void;
  onClose: () => void;
};

export function TwoFileModal({
  challenge,
  challengeType,
  challengeResult,
  activeTab,
  setActiveTab,
  codes,
  setCodes,
  feedbacks,
  fileOk,
  showHint,
  setShowHint,
  patchedTypes,
  onSubmit,
  onClose,
}: TwoFileProps) {
  const isPassed = challengeResult === "pass";

  const fileStatuses = challenge.tabs.map((key, i) => ({
    key,
    label: challenge.tabLabels[key],
    ok: fileOk[key] ?? false,
    fb: feedbacks[key] ?? "",
    dot: i === 0 ? C.purple : C.blue,
  }));

  const activeFb = feedbacks[activeTab] ?? "";
  const activeOk = fileOk[activeTab] ?? false;
  const activeHints =
    activeTab !== "diff" ? (challenge.hints[activeTab] ?? []) : [];

  const tabStatusMap = Object.fromEntries(
    challenge.tabs.map((key) => [
      key,
      fileOk[key] ? true : feedbacks[key] ? false : null,
    ]),
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        maxHeight: "90vh",
        overflow: "hidden",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 32px",
          borderBottom: `1px solid ${C.border}`,
          background: C.bg1,
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                color: C.text0,
                background: C.bg3,
                border: `1px solid ${C.border2}`,
              }}
            >
              Hotfix Required
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                color: challenge.attackColor,
                background: challenge.attackBg,
                border: `1px solid ${challenge.attackBorder}`,
              }}
            >
              {challenge.attackLabel}
            </span>
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: C.text0,
              letterSpacing: "-.02em",
              marginBottom: 8,
            }}
          >
            {challenge.title}
          </div>
          <div
            style={{
              fontSize: 14,
              color: C.text1,
              lineHeight: 1.6,
              maxWidth: 650,
            }}
          >
            {challenge.description}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.text2,
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              Reward
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: C.green,
                letterSpacing: "-.02em",
                lineHeight: 1,
              }}
            >
              +{challenge.points}
            </div>
          </div>
          <div
            style={{
              width: 1,
              height: 40,
              background: C.border,
              margin: "0 8px",
            }}
          />
          <button
            onClick={onClose}
            style={{
              fontFamily: sans,
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "8px 14px",
              color: C.text1,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, height: 600 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: C.bg0,
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              background: C.bg1,
              borderBottom: `1px solid ${C.border}`,
              padding: "0 16px",
            }}
          >
            {[...challenge.tabs, "diff"].map((t) => {
              const st = t === "diff" ? null : tabStatusMap[t];
              const active = activeTab === t;
              const label = t === "diff" ? "Diff View" : challenge.tabLabels[t];
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    fontFamily: sans,
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${active ? C.text0 : "transparent"}`,
                    padding: "16px 16px",
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? C.text0 : C.text2,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all .15s",
                    transform: "translateY(1px)",
                  }}
                >
                  {label}
                  {st === true && (
                    <span style={{ fontSize: 12, color: C.green }}>✓</span>
                  )}
                  {st === false && (
                    <span style={{ fontSize: 12, color: C.red }}>✕</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Hint toolbar */}
          {activeTab !== "diff" && (
            <div
              style={{
                padding: "12px 24px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                onClick={() => setShowHint(!showHint)}
                style={{
                  fontFamily: sans,
                  background: showHint ? C.bg2 : "transparent",
                  border: `1px solid ${showHint ? C.border2 : C.border}`,
                  borderRadius: 6,
                  padding: "6px 12px",
                  color: showHint ? C.text0 : C.text2,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {showHint ? "Hide hint" : "Show hint"}
              </button>
            </div>
          )}

          {activeTab !== "diff" && showHint && (
            <HintPanel hints={activeHints} />
          )}

          {/* Feedback bar */}
          {activeFb && activeTab !== "diff" && (
            <div
              style={{
                padding: "12px 24px",
                fontSize: 13,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderBottom: `1px solid ${activeOk ? C.greenBorder : "rgba(239,68,68,0.2)"}`,
                color: activeOk ? C.green : C.red,
                background: activeOk ? C.greenDim : C.redDim,
              }}
            >
              {activeFb}
            </div>
          )}

          {/* Code editor */}
          {activeTab !== "diff" && (
            <textarea
              value={codes[activeTab] ?? ""}
              onChange={(e) =>
                setCodes((prev) => ({ ...prev, [activeTab]: e.target.value }))
              }
              spellCheck={false}
              style={{
                flex: 1,
                background: "transparent",
                color: C.text0,
                fontFamily: mono,
                fontSize: 13.5,
                lineHeight: 1.6,
                padding: "20px 24px",
                border: "none",
                resize: "none",
                minHeight: 0,
                tabSize: 2,
              }}
            />
          )}

          {activeTab === "diff" && <DiffView challenge={challenge} />}
        </div>

        <ChallengeRightPane
          challenge={challenge}
          challengeType={challengeType}
          fileStatuses={fileStatuses}
          challengeResult={challengeResult}
          singleFeedback=""
          patchedTypes={patchedTypes}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

// ─── SingleModal ──────────────────────────────────────────────────────────────

type SingleProps = {
  challenge: SingleChallenge;
  challengeType: AttackType;
  challengeResult: ChallengeResult;
  code: string;
  setCode: (v: string) => void;
  feedback: string;
  showHint: boolean;
  setShowHint: (v: boolean | ((h: boolean) => boolean)) => void;
  patchedTypes: Set<AttackType>;
  onSubmit: () => void;
  onClose: () => void;
};

export function SingleModal({
  challenge,
  challengeType,
  challengeResult,
  code,
  setCode,
  feedback,
  showHint,
  setShowHint,
  patchedTypes,
  onSubmit,
  onClose,
}: SingleProps) {
  const tc = TYPE_COLORS[challengeType] ?? TYPE_COLORS.xss;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        background: C.bg1,
        border: `1px solid ${C.border2}`,
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        maxHeight: "96vh",
        overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "22px 28px",
          borderBottom: `1px solid ${C.border}`,
          background: C.bg0,
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".12em",
                padding: "3px 10px",
                borderRadius: 5,
                color: C.green,
                background: C.greenDim,
                border: `1px solid ${C.greenBorder}`,
              }}
            >
              HOTFIX CHALLENGE
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".12em",
                padding: "3px 10px",
                borderRadius: 5,
                color: tc.text,
                background: tc.bg,
                border: `1px solid ${tc.border}`,
              }}
            >
              {TYPE_LABELS[challengeType]}
            </span>
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: C.text0,
              letterSpacing: "-.03em",
              marginBottom: 8,
            }}
          >
            {challenge.title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.text1,
              lineHeight: 1.7,
              maxWidth: 600,
            }}
          >
            {challenge.description}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              background: C.greenDim,
              border: `1px solid ${C.greenBorder}`,
              borderRadius: 12,
              padding: "12px 22px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".12em",
                color: C.green,
                marginBottom: 4,
              }}
            >
              REWARD
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: C.green,
                letterSpacing: "-.04em",
                lineHeight: 1,
              }}
            >
              +{challenge.points}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: sans,
              background: "transparent",
              border: `1px solid ${C.border2}`,
              borderRadius: 8,
              padding: "9px 16px",
              color: C.text2,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ESC ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, height: 560 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: C.bg0,
          }}
        >
          <div
            style={{
              padding: "10px 20px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setShowHint((h) => !h)}
              style={{
                fontFamily: sans,
                background: showHint ? C.amberDim : "transparent",
                border: `1px solid ${showHint ? "rgba(251,191,36,0.3)" : C.border2}`,
                borderRadius: 7,
                padding: "6px 14px",
                color: showHint ? C.amber : C.text2,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              💡 {showHint ? "Hide hint" : "Show hint"}
            </button>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                color: C.text3,
                fontFamily: mono,
              }}
            >
              hotfix.ts
            </span>
          </div>

          {showHint && <HintPanel hints={challenge.hints} />}

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              background: C.bg0,
              color: "#c9c5bc",
              fontFamily: mono,
              fontSize: 13,
              lineHeight: 1.8,
              padding: "12px 20px 24px",
              border: "none",
              outline: "none",
              resize: "none",
              minHeight: 0,
              tabSize: 2,
            }}
          />
        </div>

        <ChallengeRightPane
          challenge={challenge}
          challengeType={challengeType}
          fileStatuses={[]}
          challengeResult={challengeResult}
          singleFeedback={feedback}
          patchedTypes={patchedTypes}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
