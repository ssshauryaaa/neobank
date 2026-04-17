"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HehehehePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={s.root}>
      {/* Background glow effect */}
      <div style={s.glow} />

      <div style={s.container}>
        {/* Status Badge */}
        <div style={s.badgeWrapper}>
          <span style={s.badge}>
            <span style={s.dot} />
            UNDOCUMENTED ROUTE
          </span>
        </div>

        <h1 style={s.title}>System Override.</h1>

        <p style={s.subtitle}>
          You have successfully navigated to an unlisted directory.
        </p>

        <div style={s.terminal}>
          <div style={s.terminalHeader}>
            <div style={s.macDots}>
              <div style={{ ...s.macDot, backgroundColor: "#FF5F56" }} />
              <div style={{ ...s.macDot, backgroundColor: "#FFBD2E" }} />
              <div style={{ ...s.macDot, backgroundColor: "#27C93F" }} />
            </div>
            <span style={s.terminalTitle}>system_log.txt</span>
          </div>
          <div style={s.terminalBody}>
            <p style={s.codeLine}>
              <span style={s.prompt}>$</span> ping -c 1 admins
            </p>
            <p style={s.codeLine}>
              <span style={s.success}>[OK]</span> Easter egg located.
            </p>
            <p style={{ ...s.codeLine, marginTop: 16 }}>
              <span style={s.comment}>// Action required:</span>
            </p>
            <p style={s.codeLine}>
              Take a screenshot and contact the moderators immediately.
              <br />
              Subject: "I found the Pi."
              <br />
              Reward: Account points credited upon verification.
            </p>
          </div>
        </div>

        <Link href="/dashboard" style={s.button}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#000000",
    fontFamily: "Inter, system-ui, sans-serif",
    padding: "24px",
    overflow: "hidden",
    color: "#ffffff",
  },
  glow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "600px",
    height: "600px",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "560px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  badgeWrapper: {
    marginBottom: "32px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "99px",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    color: "#A1A1AA",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#22c55e", // subtle green dot
    boxShadow: "0 0 8px #22c55e",
  },
  title: {
    fontSize: "48px",
    fontWeight: 800,
    letterSpacing: "-0.04em",
    margin: "0 0 16px 0",
    color: "#ffffff",
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: "18px",
    color: "#A1A1AA",
    margin: "0 0 40px 0",
    lineHeight: 1.5,
  },
  terminal: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    border: "1px solid #27272A",
    borderRadius: "12px",
    overflow: "hidden",
    textAlign: "left",
    marginBottom: "40px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
  },
  terminalHeader: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#121212",
    borderBottom: "1px solid #27272A",
  },
  macDots: {
    display: "flex",
    gap: "6px",
    marginRight: "16px",
  },
  macDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  terminalTitle: {
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#71717A",
  },
  terminalBody: {
    padding: "24px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  codeLine: {
    margin: "0 0 8px 0",
    color: "#E4E4E7",
  },
  prompt: { color: "#71717A", marginRight: "8px" },
  success: { color: "#22C55E", marginRight: "8px" },
  comment: { color: "#71717A", fontStyle: "italic" },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    color: "#000000",
    padding: "14px 28px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "14px",
    textDecoration: "none",
    transition: "background-color 0.2s ease, transform 0.1s ease",
  },
};
