import React from "react";
import { C, mono } from "../constants/theme";

export function HintPanel({ hints }: { hints: string[] }) {
  return (
    <div
      style={{
        padding: "14px 20px",
        background: "rgba(251,191,36,0.06)",
        borderBottom: `1px solid rgba(251,191,36,0.15)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13 }}>💡</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".12em",
            color: C.amber,
          }}
        >
          HINT
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {hints.map((h, i) =>
          h.includes("\n") ? (
            <pre
              key={i}
              style={{
                margin: 0,
                padding: "10px 14px",
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.18)",
                borderRadius: 6,
                fontFamily: mono,
                fontSize: 12,
                color: "#e8c46a",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {h}
            </pre>
          ) : (
            <p
              key={i}
              style={{
                margin: 0,
                fontSize: 13,
                color: "#d4a847",
                lineHeight: 1.6,
              }}
            >
              {h}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
