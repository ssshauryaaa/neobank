"use client";

import { useState, useEffect } from "react";

const PATCH_KEYS = {
  sqli: "patched_sqli",
  jwt_forge: "patched_jwt",
  xss: "patched_xss",
  idor: "patched_idor",
};

// Updated to match the light theme severity palette
const VULN_META = {
  sqli: {
    label: "SQL Injection",
    endpoint: "/api/login, /api/search",
    description: "String concatenation in queries — login bypass, data dump",
    icon: "⛁",
    color: "#991b1b", // Deep Burgundy
    colorDim: "#fef2f2",
    colorBorder: "#fca5a5",
  },
  jwt_forge: {
    label: "JWT Forgery",
    endpoint: "/api/user",
    description:
      "Weak secret + no algorithm enforcement — privilege escalation",
    icon: "⚿",
    color: "#9a3412", // Rust Orange
    colorDim: "#fff7ed",
    colorBorder: "#fdba74",
  },
  xss: {
    label: "XSS Injection",
    endpoint: "/api/transfer, /api/search",
    description: "dangerouslySetInnerHTML on user input — session hijack",
    icon: "◈",
    color: "#b45309", // Dark Amber
    colorDim: "#fffbeb",
    colorBorder: "#fcd34d",
  },
  idor: {
    label: "IDOR Attack",
    endpoint: "/api/user",
    description: "No ownership check on user ID — cross-account data access",
    icon: "◎",
    color: "#0f766e", // Slate Teal
    colorDim: "#f0fdfa",
    colorBorder: "#5eead4",
  },
} as const;

type VulnKey = keyof typeof VULN_META;

type PatchState = Record<VulnKey, boolean>;
type ResetState = "idle" | "confirming" | "resetting" | "done";

export default function ResetPage() {
  const [patchState, setPatchState] = useState<PatchState>({
    sqli: false,
    jwt_forge: false,
    xss: false,
    idor: false,
  });
  const [resetState, setResetState] = useState<ResetState>("idle");
  const [confirmTarget, setConfirmTarget] = useState<VulnKey | "all" | null>(
    null,
  );
  const [serverStatus, setServerStatus] = useState<"unknown" | "ok" | "error">(
    "unknown",
  );
  const [log, setLog] = useState<{ ts: number; msg: string; ok: boolean }[]>(
    [],
  );

  // Poll localStorage patch state
  useEffect(() => {
    function sync() {
      setPatchState({
        sqli: localStorage.getItem(PATCH_KEYS.sqli) === "1",
        jwt_forge: localStorage.getItem(PATCH_KEYS.jwt_forge) === "1",
        xss: localStorage.getItem(PATCH_KEYS.xss) === "1",
        idor: localStorage.getItem(PATCH_KEYS.idor) === "1",
      });
    }
    sync();
    const iv = setInterval(sync, 600);
    return () => clearInterval(iv);
  }, []);

  // Check server patch status on mount
  useEffect(() => {
    fetch("/api/patch")
      .then((r) => r.json())
      .then(() => setServerStatus("ok"))
      .catch(() => setServerStatus("error"));
  }, []);

  function addLog(msg: string, ok: boolean) {
    setLog((prev) => [{ ts: Date.now(), msg, ok }, ...prev].slice(0, 20));
  }

  async function resetSingle(key: VulnKey) {
    setResetState("resetting");

    // Clear localStorage
    localStorage.removeItem(PATCH_KEYS[key]);

    // Clear server flag
    try {
      const targetMap: Record<VulnKey, string> = {
        sqli: "sqli",
        jwt_forge: "jwt",
        xss: "xss",
        idor: "idor",
      };
      await fetch("/api/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: targetMap[key], action: "revert" }),
      });
      addLog(`${VULN_META[key].label} reset — vulnerability restored`, true);
    } catch {
      addLog(`${VULN_META[key].label} — server flag may still be set`, false);
    }

    setPatchState((prev) => ({ ...prev, [key]: false }));
    setResetState("idle");
    setConfirmTarget(null);
  }

  async function resetAll() {
    setResetState("resetting");

    // Clear all localStorage flags
    Object.values(PATCH_KEYS).forEach((k) => localStorage.removeItem(k));

    // Clear server flags
    try {
      await fetch("/api/patch/reset", { method: "POST" });
      addLog("All vulnerabilities reset — system fully exploitable", true);
      setServerStatus("ok");
    } catch {
      addLog(
        "Server reset failed — localStorage cleared, server flags may persist",
        false,
      );
      setServerStatus("error");
    }

    setPatchState({ sqli: false, jwt_forge: false, xss: false, idor: false });
    setResetState("done");
    setConfirmTarget(null);
    setTimeout(() => setResetState("idle"), 2000);
  }

  const patchedCount = Object.values(patchState).filter(Boolean).length;
  const allVulnerable = patchedCount === 0;

  const sans = "'Inter', system-ui, sans-serif";
  const mono = "'JetBrains Mono', monospace";
  const bdr = "1px solid #E8E3DF";

  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF9F8",
        fontFamily: sans,
        color: "#1C1917",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1240,
          display: "flex",
          gap: 24,
          height: "calc(100vh - 64px)",
        }}
      >
        {/* ── LEFT: Main Panel ── */}
        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            border: bdr,
            borderRadius: 12,
            padding: "40px 48px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)",
          }}
        >
          {/* Main Title Area */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 40,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    background: "#991b1b",
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    padding: "4px 8px",
                    borderRadius: 4,
                  }}
                >
                  RED TEAM
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    color: "#5C534D",
                  }}
                >
                  // ENVIRONMENT OVERRIDE
                </span>
              </div>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#1C1917",
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                Vulnerability Reset
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "#5C534D",
                  lineHeight: 1.6,
                  margin: 0,
                  maxWidth: 560,
                }}
              >
                Revert patched security layers back to their exploitable state.
                Use this to initialize lab environments and re-test attack
                vectors.
              </p>
            </div>

            {/* Server Status Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#FAFAFA",
                border: bdr,
                padding: "8px 16px",
                borderRadius: 20,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    serverStatus === "ok"
                      ? "#15803d"
                      : serverStatus === "error"
                        ? "#991b1b"
                        : "#A8A29E",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "#5C534D",
                  fontFamily: mono,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                SERVER{" "}
                <span
                  style={{
                    color:
                      serverStatus === "ok"
                        ? "#15803d"
                        : serverStatus === "error"
                          ? "#991b1b"
                          : "#78716C",
                  }}
                >
                  {serverStatus === "ok"
                    ? "CONNECTED"
                    : serverStatus === "error"
                      ? "OFFLINE"
                      : "PING..."}
                </span>
              </span>
            </div>
          </div>

          {/* System status bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              background: "#FAFAFA",
              border: bdr,
              borderRadius: 10,
              marginBottom: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: allVulnerable ? "#15803d" : "#991b1b",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: allVulnerable ? "#15803d" : "#991b1b",
                }}
              >
                {allVulnerable
                  ? "SYSTEM 100% VULNERABLE"
                  : `${patchedCount} / 4 NODES SECURED`}
              </span>
            </div>
            <div style={{ flex: 1, height: 1, background: "#E8E3DF" }} />
            <div style={{ display: "flex", gap: 8 }}>
              {(Object.keys(VULN_META) as VulnKey[]).map((key) => (
                <div
                  key={key}
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: patchState[key]
                      ? VULN_META[key].color
                      : "#E8E3DF",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Vuln cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 36,
            }}
          >
            {(Object.keys(VULN_META) as VulnKey[]).map((key) => {
              const meta = VULN_META[key];
              const isPatched = patchState[key];
              const isConfirming = confirmTarget === key;
              return (
                <div
                  key={key}
                  style={{
                    background: isPatched ? meta.colorDim : "#FAFAFA",
                    border: `1px solid ${isPatched ? meta.colorBorder : "#E8E3DF"}`,
                    borderRadius: 12,
                    padding: "24px",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: isPatched ? "#FFFFFF" : "#F5F5F4",
                          border: `1px solid ${isPatched ? meta.colorBorder : "#E8E3DF"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          color: isPatched ? meta.color : "#A8A29E",
                        }}
                      >
                        {meta.icon}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: isPatched ? meta.color : "#1C1917",
                            letterSpacing: "0.02em",
                            marginBottom: 4,
                          }}
                        >
                          {meta.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#78716C",
                            fontFamily: mono,
                          }}
                        >
                          {meta.endpoint}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: isPatched ? "#FFFFFF" : "#fef2f2",
                        border: `1px solid ${isPatched ? meta.colorBorder : "#fca5a5"}`,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: isPatched ? meta.color : "#991b1b",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          color: isPatched ? meta.color : "#991b1b",
                        }}
                      >
                        {isPatched ? "SECURED" : "EXPOSED"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "#5C534D",
                      lineHeight: 1.6,
                      marginBottom: 20,
                    }}
                  >
                    {meta.description}
                  </div>

                  {/* Action area */}
                  <div>
                    {!isPatched ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#78716C",
                          fontFamily: mono,
                          fontWeight: 500,
                          padding: "10px 14px",
                          background: "#FFFFFF",
                          borderRadius: 8,
                          border: bdr,
                          textAlign: "center",
                        }}
                      >
                        // EXPLOITABLE : NO ACTION NEEDED
                      </div>
                    ) : isConfirming ? (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => resetSingle(key)}
                          disabled={resetState === "resetting"}
                          style={{
                            fontFamily: sans,
                            flex: 1,
                            padding: "10px 0",
                            borderRadius: 8,
                            background: meta.color,
                            border: "none",
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            cursor: "pointer",
                          }}
                        >
                          {resetState === "resetting"
                            ? "INJECTING..."
                            : "CONFIRM RESET"}
                        </button>
                        <button
                          onClick={() => setConfirmTarget(null)}
                          style={{
                            fontFamily: sans,
                            padding: "10px 16px",
                            borderRadius: 8,
                            background: "#FFFFFF",
                            border: `1px solid ${meta.colorBorder}`,
                            color: meta.color,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmTarget(key)}
                        style={{
                          fontFamily: sans,
                          width: "100%",
                          padding: "10px 0",
                          borderRadius: 8,
                          background: "#FFFFFF",
                          border: `1px solid ${meta.colorBorder}`,
                          color: meta.color,
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = meta.color;
                          e.currentTarget.style.color = "#FFFFFF";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "#FFFFFF";
                          e.currentTarget.style.color = meta.color;
                        }}
                      >
                        <span style={{ fontSize: 14 }}>↺</span> RESET
                        VULNERABILITY
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset All Footer panel */}
          <div
            style={{
              marginTop: "auto",
              background: "#FAFAFA",
              border: bdr,
              borderRadius: 12,
              padding: "24px 32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#1C1917",
                    marginBottom: 4,
                  }}
                >
                  Global System Purge
                </div>
                <div
                  style={{ fontSize: 13, color: "#5C534D", lineHeight: 1.5 }}
                >
                  Wipe all defensive patches globally. This will immediately
                  expose all network endpoints to attack simulation.
                </div>
              </div>
              <div style={{ marginLeft: 24, flexShrink: 0 }}>
                {confirmTarget === "all" ? (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={resetAll}
                      disabled={resetState === "resetting"}
                      style={{
                        fontFamily: sans,
                        padding: "12px 24px",
                        borderRadius: 8,
                        background: "#991b1b",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {resetState === "resetting"
                        ? "PURGING..."
                        : resetState === "done"
                          ? "✓ SYSTEM EXPOSED"
                          : "CONFIRM PURGE"}
                    </button>
                    <button
                      onClick={() => setConfirmTarget(null)}
                      style={{
                        fontFamily: sans,
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "#FFFFFF",
                        border: "1px solid #D6D3D1",
                        color: "#44403C",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!allVulnerable) setConfirmTarget("all");
                    }}
                    disabled={allVulnerable}
                    style={{
                      fontFamily: sans,
                      padding: "12px 24px",
                      borderRadius: 8,
                      background: allVulnerable ? "#F5F5F4" : "#fef2f2",
                      border: `1px solid ${allVulnerable ? "#D6D3D1" : "#fca5a5"}`,
                      color: allVulnerable ? "#A8A29E" : "#991b1b",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      cursor: allVulnerable ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseOver={(e) => {
                      if (!allVulnerable) {
                        e.currentTarget.style.background = "#991b1b";
                        e.currentTarget.style.color = "#FFFFFF";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!allVulnerable) {
                        e.currentTarget.style.background = "#fef2f2";
                        e.currentTarget.style.color = "#991b1b";
                      }
                    }}
                  >
                    {allVulnerable ? "SYSTEM EXPOSED" : "⚠ PURGE ALL DEFENSES"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Activity Log ── */}
        <div
          style={{
            width: 340,
            background: "#FFFFFF",
            border: bdr,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              background: "#FAFAFA",
              borderBottom: bdr,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#5C534D",
              }}
            >
              TERMINAL LOG
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#78716C",
                fontFamily: mono,
                fontWeight: 500,
              }}
            >
              [{log.length}] SEQ
            </span>
          </div>

          {/* Current patch state summary */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: bdr,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#A8A29E",
                marginBottom: 12,
              }}
            >
              NODE STATUS MAP
            </div>
            {(Object.keys(VULN_META) as VulnKey[]).map((key) => {
              const meta = VULN_META[key];
              const isPatched = patchState[key];
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: isPatched ? meta.color : "#991b1b",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: isPatched ? meta.color : "#5C534D",
                        fontWeight: 600,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: isPatched ? meta.color : "#991b1b",
                      fontFamily: mono,
                    }}
                  >
                    {isPatched ? "SECURED" : "VULN"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Log entries */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {log.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#A8A29E",
                  textAlign: "center",
                  marginTop: 40,
                  fontFamily: mono,
                }}
              >
                &gt; awaiting input...
              </div>
            ) : (
              log.map((entry, i) => (
                <div
                  key={i}
                  style={{ marginBottom: 16, opacity: 1 - i * 0.05 }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#A8A29E",
                      fontFamily: mono,
                      marginBottom: 4,
                    }}
                  >
                    [{fmt(entry.ts)}]
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: entry.ok ? "#15803d" : "#991b1b",
                      lineHeight: 1.5,
                      fontFamily: mono,
                      fontWeight: 500,
                    }}
                  >
                    {entry.ok ? "✓ SUCCESS:" : "✗ ERROR:"} {entry.msg}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick nav */}
          <div
            style={{
              padding: "20px 24px",
              borderTop: bdr,
              background: "#FAFAFA",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#A8A29E",
                marginBottom: 12,
              }}
            >
              MODULE LINKS
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                { label: "DEFENSE", href: "/defense", icon: "⛨" },
                { label: "LOGIN", href: "/login", icon: "⬡" },
                { label: "SEARCH", href: "/search", icon: "◈" },
                { label: "PROFILE", href: "/profile", icon: "⚿" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px",
                    background: "#FFFFFF",
                    border: bdr,
                    borderRadius: 8,
                    textDecoration: "none",
                    color: "#5C534D",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#F5F5F4";
                    e.currentTarget.style.color = "#1C1917";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.color = "#5C534D";
                  }}
                >
                  <span style={{ fontSize: 14 }}>{link.icon}</span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap");

        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: #faf9f8;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d6d3d1;
          border-radius: 6px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a29e;
        }
        button:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
