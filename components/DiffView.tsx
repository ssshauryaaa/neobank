import React from "react";
import type { TwoFileChallenge } from "../types";
import { C, mono } from "../constants/theme";

// ── Primitives ────────────────────────────────────────────────────────────────

export function DiffHeader({
  label,
  color,
  top = false,
}: {
  label: string;
  color: string;
  top?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 20px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".1em",
        color,
        borderBottom: `1px solid ${color}26`,
        ...(top ? { borderTop: `1px solid ${color}26`, marginTop: 12 } : {}),
        background: `${color}0a`,
      }}
    >
      {label}
    </div>
  );
}

export function DiffLine({
  line,
  num,
  bad,
}: {
  line: string;
  num: number;
  bad: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr" }}>
      <span
        style={{
          color: "#52525b",
          padding: "0 12px",
          textAlign: "right",
          userSelect: "none",
          fontSize: 11,
        }}
      >
        {num}
      </span>
      <span
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          paddingRight: 20,
          background: bad ? "rgba(248,113,113,0.13)" : "transparent",
          color: bad ? "#fca5a5" : "#71717a",
        }}
      >
        {line || " "}
      </span>
    </div>
  );
}

export function DiffFixLine({ line }: { line: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr" }}>
      <span
        style={{
          color: "#10b981",
          padding: "0 12px",
          textAlign: "right",
          opacity: 0.5,
          fontSize: 11,
        }}
      >
        +
      </span>
      <span
        style={{
          whiteSpace: "pre-wrap",
          color: "#86efac",
          background: "rgba(74,222,128,0.08)",
          paddingRight: 20,
        }}
      >
        {line || " "}
      </span>
    </div>
  );
}

// ── DiffView — generic, driven entirely by the challenge definition ────────────

export function DiffView({ challenge }: { challenge: TwoFileChallenge }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg0 }}>
      {challenge.tabs.map((tabKey, idx) => {
        const label = challenge.tabLabels[tabKey];
        const code = challenge.startCodes[tabKey];
        const pattern = challenge.diffVulnLines[tabKey];
        const fixes = challenge.fixLines[tabKey];
        return (
          <div key={tabKey}>
            <DiffHeader
              label={`VULNERABLE — ${label}`}
              color={C.red}
              top={idx > 0}
            />
            <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.8 }}>
              {code.split("\n").map((line, i) => (
                <DiffLine
                  key={i}
                  line={line}
                  num={i + 1}
                  bad={pattern.test(line)}
                />
              ))}
            </div>
            <DiffHeader label={`REQUIRED FIX — ${label}`} color={C.green} top />
            <div
              style={{
                fontFamily: mono,
                fontSize: 12,
                lineHeight: 1.8,
                paddingBottom: 12,
              }}
            >
              {fixes.map((line, i) => (
                <DiffFixLine key={i} line={line} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
