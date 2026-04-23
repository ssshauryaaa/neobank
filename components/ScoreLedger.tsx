import React from "react";
import type { ScoreEntry } from "../types";
import { TYPE_LABELS, TYPE_COLORS, mono } from "../constants/theme";
import { fmtTime } from "../utils/format";

type Props = {
  scoreHistory: ScoreEntry[];
};

export function ScoreLedger({ scoreHistory }: Props) {
  return (
    <div style={{ borderTop: "1px solid #1e1e24", flexShrink: 0 }}>
      <div
        style={{
          padding: "11px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#0d0d10",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".1em",
            color: "#3a3a42",
          }}
        >
          PATCH LEDGER
        </span>
        <span style={{ fontSize: 10, color: "#2a2a30" }}>
          {scoreHistory.length} fixes
        </span>
      </div>

      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {scoreHistory.length === 0 ? (
          <div
            style={{
              padding: "16px 22px",
              color: "#2a2a30",
              fontSize: 11,
              textAlign: "center",
            }}
          >
            No patches deployed yet
          </div>
        ) : (
          scoreHistory.map((h, i) => {
            const tc = TYPE_COLORS[h.type];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 22px",
                  borderBottom: "1px solid #16161a",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: tc.text,
                      letterSpacing: ".06em",
                      marginBottom: 2,
                    }}
                  >
                    {TYPE_LABELS[h.type]}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#4a4a52",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {h.detail}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#3a3a42",
                      marginTop: 2,
                      fontFamily: mono,
                    }}
                  >
                    {fmtTime(h.ts)}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#4ade80",
                    marginLeft: 12,
                    letterSpacing: "-.02em",
                    fontFamily: mono,
                  }}
                >
                  +{h.points}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
