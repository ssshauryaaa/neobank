"use client";
import React from "react";
import type { AttackType } from "@/types";
import { VulnerabilityScanner } from "@/components/VulnerabilityScanner";

type Props = {
  patchedTypes: Set<AttackType>;
  onScanComplete: (pts: number) => void;
};

export function ScanTab({ patchedTypes, onScanComplete }: Props) {
  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0d1117", overflow: "hidden" }}>
        <style>{`
          .scan-tab-inner > div:first-child {
            position: relative !important;
            inset: auto !important;
            background: transparent !important;
            backdrop-filter: none !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: stretch !important;
            justify-content: stretch !important;
          }
          .scan-tab-inner > div:first-child > div:first-child {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        `}</style>
        <div className="scan-tab-inner" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <VulnerabilityScanner
            patchedTypes={patchedTypes}
            onClose={() => { /* no-op — scanner lives in the tab */ }}
            onScanComplete={onScanComplete}
          />
        </div>
      </div>
    </div>
  );
}
