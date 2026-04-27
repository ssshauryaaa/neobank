import React, { useState } from "react";
import type { LogEntry, AttackType } from "../types";
import {
  SEV_CONFIG,
  TYPE_LABELS,
  TYPE_COLORS,
  mono,
  sans,
} from "../constants/theme";
import { fmtTime } from "../utils/format";

type Props = {
  log: LogEntry;
  isSelected: boolean;
  patchedTypes: Set<AttackType>;
  onSelect: (id: string) => void;
};

export function LogRow({ log, isSelected, patchedTypes, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const sev = SEV_CONFIG[log.severity];
  const tc = TYPE_COLORS[log.type];
  const isGP = patchedTypes.has(log.type);

  return (
    <div
      onClick={() => onSelect(log.id)}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "88px 82px 150px 1fr 110px",
        alignItems: "center",
        padding: "11px 24px",
        borderBottom: "1px solid #e2e8f0",
        borderLeft: `3px solid ${isSelected ? sev.dot : "transparent"}`,
        background: isSelected
          ? "#f1f5f9"
          : hovered
            ? "#f8fafc"
            : "transparent",
        cursor: "pointer",
        opacity: isGP ? 0.35 : 1,
        transition: "background .1s",
      }}
    >
      <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: mono }}>
        {fmtTime(log.ts)}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: sev.dot,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".06em",
            color: sev.color,
          }}
        >
          {sev.label}
        </span>
      </div>

      <div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".06em",
            padding: "2px 7px",
            borderRadius: 4,
            color: tc.text,
            background: tc.bg,
            border: `1px solid ${tc.border}`,
          }}
        >
          {TYPE_LABELS[log.type]}
        </span>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingRight: 16,
        }}
      >
        <span style={{ color: sev.color, fontWeight: 700, marginRight: 7 }}>
          {log.user}
        </span>
        {log.detail}
      </div>

      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
        {isGP && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 4,
              color: "#4ade80",
              background: "rgba(74,222,128,.1)",
              border: "1px solid rgba(74,222,128,.2)",
              letterSpacing: ".06em",
            }}
          >
            FIXED
          </span>
        )}
        {!isGP && log.detected && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 4,
              color: "#38bdf8",
              background: "rgba(56,189,248,.08)",
              border: "1px solid rgba(56,189,248,.2)",
              letterSpacing: ".06em",
            }}
          >
            ACK
          </span>
        )}
      </div>
    </div>
  );
}
