"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── All localStorage keys used by Neobank CTF ─────────────────────────────
const RESET_KEYS = [
  { key: "patched_sqli",      label: "SQL Injection Patch", icon: "⛁", category: "defense" },
  { key: "patched_jwt",       label: "JWT Forgery Patch",   icon: "⚿", category: "defense" },
  { key: "patched_xss",       label: "XSS Injection Patch", icon: "◈", category: "defense" },
  { key: "patched_idor",      label: "IDOR Attack Patch",   icon: "◎", category: "defense" },
  { key: "real_attack_log",   label: "Real Attack Log",     icon: "⚡", category: "logs" },
  { key: "session_token",     label: "Active User Session", icon: "🔑", category: "session" },
];

type Category = "defense" | "logs" | "session" | "all";

const CATEGORY_LABELS: Record<Category, string> = {
  defense: "Defense Dashboard",
  logs:    "Attack & Traffic Logs",
  session: "User Sessions",
  all:     "Everything",
};

const CATEGORY_COLORS: Record<Category, { text: string; bg: string; border: string; glow: string }> = {
  defense: { text: "#f87171", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  glow: "rgba(239,68,68,0.15)"  },
  logs:    { text: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)", glow: "rgba(96,165,250,0.15)" },
  session: { text: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)", glow: "rgba(251,191,36,0.15)" },
  all:     { text: "#f5820a", bg: "rgba(245,130,10,0.08)", border: "rgba(245,130,10,0.25)", glow: "rgba(245,130,10,0.15)" },
};

const mono = "'DM Mono', 'JetBrains Mono', monospace";
const sans = "'Nunito', 'Inter', sans-serif";

// ── Password gate ─────────────────────────────────────────────────────────────
const RESET_PASSWORD = "breach@trix2025";

export default function AdminResetPage() {
  const router = useRouter();
  const [authed, setAuthed]       = useState(false);
  const [pw, setPw]               = useState("");
  const [pwError, setPwError]     = useState(false);
  const [lsState, setLsState]     = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState<Category | null>(null);
  const [log, setLog]             = useState<{ ts: string; msg: string; ok: boolean }[]>([]);
  const [confirm, setConfirm]     = useState<Category | null>(null);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Scan current state of each key
  const refreshState = () => {
    const s: Record<string, boolean> = {};
    RESET_KEYS.forEach(k => { s[k.key] = !!localStorage.getItem(k.key); });
    setLsState(s);
  };

  useEffect(() => {
    if (authed) refreshState();
  }, [authed]);

  function handleAuth() {
    if (pw === RESET_PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPw("");
    }
  }

  function addLog(msg: string, ok = true) {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLog(prev => [{ ts, msg, ok }, ...prev].slice(0, 50));
  }

  async function doReset(category: Category) {
    setResetting(category);
    setConfirm(null);
    const toReset = category === "all"
      ? RESET_KEYS
      : RESET_KEYS.filter(k => k.category === category);

    // Simulate a deliberate delay for UX — feels like a real system operation
    for (const { key, label } of toReset) {
      await new Promise(r => setTimeout(r, 220));
      const had = !!localStorage.getItem(key);
      localStorage.removeItem(key);
      if (had) addLog(`Cleared: ${label} (${key})`);
      else     addLog(`Skipped: ${label} — already empty`, false);
    }

    if (category === "defense" || category === "all") {
      try {
        await fetch("/api/patch/reset", { method: "POST" });
        addLog("Server vulnerabilities reset — system fully exploitable", true);
      } catch (e) {
        addLog("Server reset failed locally (offline)", false);
      }
    }

    addLog(`✓ ${CATEGORY_LABELS[category]} reset complete`, true);
    setResetting(null);
    refreshState();
  }

  // ── Password gate UI ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans }}>
        <div style={{ width: 400, opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(12px)", transition: "all 0.5s" }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(245,130,10,0.15)", border: "1px solid rgba(245,130,10,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <span style={{ fontSize: 24 }}>🔒</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", marginBottom: 4 }}>
              Neobank <span style={{ color: "#f5820a" }}>Admin Reset</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: mono, letterSpacing: ".08em" }}>
              RESTRICTED — EVENT ORGANISERS ONLY
            </div>
          </div>

          <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "28px 28px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8, fontFamily: mono }}>
              Admin Password
            </label>
            <input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && handleAuth()}
              placeholder="Enter event admin password"
              autoFocus
              style={{ width: "100%", background: "#0d1117", border: `1.5px solid ${pwError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "11px 14px", fontSize: 13, fontFamily: mono, color: "#e2e8f0", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
            />
            {pwError && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#f87171", fontWeight: 600, fontFamily: mono }}>
                ✗ Incorrect password
              </div>
            )}
            <button
              onClick={handleAuth}
              style={{ marginTop: 16, width: "100%", background: "linear-gradient(135deg,#1a3c6e,#2d5f8a)", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer", letterSpacing: ".03em", fontFamily: sans, transition: "opacity 0.2s" }}
            >
              Authenticate →
            </button>
          </div>

          <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: mono }}>
            This page is not linked in the main UI. Access via /reset
          </div>
        </div>
      </div>
    );
  }

  // ── Main reset UI ─────────────────────────────────────────────────────────────
  const activeKeys  = RESET_KEYS.filter(k => lsState[k.key]);
  const inactiveKeys = RESET_KEYS.filter(k => !lsState[k.key]);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: sans, color: "#e2e8f0", fontSize: 13 }}>

      {/* Header */}
      <header style={{ padding: "0 32px", height: 58, background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(245,130,10,0.15)", border: "1px solid rgba(245,130,10,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔧</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Neobank <span style={{ color: "#f5820a" }}>Event Control</span></div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: mono, letterSpacing: ".06em" }}>SESSION RESET PANEL · ORGANISERS ONLY</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 10, fontFamily: mono, color: activeKeys.length > 0 ? "#fbbf24" : "#4ade80", background: activeKeys.length > 0 ? "rgba(251,191,36,0.1)" : "rgba(74,222,128,0.1)", border: `1px solid ${activeKeys.length > 0 ? "rgba(251,191,36,0.25)" : "rgba(74,222,128,0.25)"}`, padding: "3px 10px", borderRadius: 6 }}>
            {activeKeys.length > 0 ? `${activeKeys.length} keys active` : "All clear"}
          </div>
          <button onClick={() => router.push("/defense")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "6px 14px", color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: sans }}>
            ← Dashboard
          </button>
        </div>
      </header>

      <main style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>

        {/* Warning banner */}
        <div style={{ background: "rgba(239,68,68,0.07)", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#f87171", marginBottom: 2 }}>CAUTION — Destructive Actions Ahead</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: mono }}>
              All resets clear browser localStorage. This removes patched vulnerabilities and attack logs. Use between CTF rounds to give teams a clean slate.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>

          {/* Left: Reset controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Full reset — most prominent */}
            <div style={{ background: "#161b22", border: "1.5px solid rgba(245,130,10,0.3)", borderRadius: 12, padding: "20px 22px", boxShadow: "0 0 30px rgba(245,130,10,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f5820a", marginBottom: 4 }}>🔄 Full Environment Reset</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: mono }}>
                    Clears ALL CTF state — patches, logs, and sessions. Gives teams a completely fresh start.
                  </div>
                </div>
                {confirm === "all" ? (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setConfirm(null)} style={{ padding: "8px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: sans }}>Cancel</button>
                    <button onClick={() => doReset("all")} style={{ padding: "8px 18px", background: "#dc2626", border: "none", borderRadius: 7, color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: sans }}>Confirm Reset</button>
                  </div>
                ) : (
                  <button
                    disabled={!!resetting}
                    onClick={() => setConfirm("all")}
                    style={{ padding: "10px 20px", background: resetting ? "#374151" : "linear-gradient(135deg,#c2410c,#dc2626)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 800, cursor: resetting ? "not-allowed" : "pointer", fontFamily: sans, flexShrink: 0, opacity: resetting ? 0.5 : 1, transition: "all 0.2s", letterSpacing: ".03em" }}
                  >
                    {resetting === "all" ? "Resetting…" : "Reset All ⚡"}
                  </button>
                )}
              </div>
            </div>

            {/* Category resets */}
            {(["defense", "logs", "session"] as Category[]).map(cat => {
              const col = CATEGORY_COLORS[cat];
              const catKeys = RESET_KEYS.filter(k => k.category === cat);
              if (catKeys.length === 0) return null;
              const activeCount = catKeys.filter(k => lsState[k.key]).length;
              const isResetting = resetting === cat;
              return (
                <div key={cat} style={{ background: "#161b22", border: `1px solid ${activeCount > 0 ? col.border : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "16px 20px", transition: "border-color 0.3s", boxShadow: activeCount > 0 ? `0 0 20px ${col.glow}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: activeCount > 0 ? col.text : "rgba(255,255,255,0.4)" }}>
                          {CATEGORY_LABELS[cat]}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, letterSpacing: ".07em", background: activeCount > 0 ? col.bg : "rgba(255,255,255,0.04)", color: activeCount > 0 ? col.text : "rgba(255,255,255,0.25)", border: `1px solid ${activeCount > 0 ? col.border : "rgba(255,255,255,0.08)"}` }}>
                          {activeCount}/{catKeys.length} ACTIVE
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {catKeys.map(({ key, label, icon }) => (
                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 5, fontSize: 10, fontFamily: mono, background: lsState[key] ? col.bg : "rgba(255,255,255,0.03)", border: `1px solid ${lsState[key] ? col.border : "rgba(255,255,255,0.06)"}`, color: lsState[key] ? col.text : "rgba(255,255,255,0.2)" }}>
                            <span>{icon}</span>
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
                      {confirm === cat ? (
                        <>
                          <button onClick={() => setConfirm(null)} style={{ padding: "7px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: sans }}>Cancel</button>
                          <button onClick={() => doReset(cat)} style={{ padding: "7px 14px", background: "#dc2626", border: "none", borderRadius: 6, color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: sans }}>Confirm</button>
                        </>
                      ) : (
                        <button
                          disabled={!!resetting || activeCount === 0}
                          onClick={() => setConfirm(cat)}
                          style={{ padding: "8px 16px", background: activeCount > 0 && !resetting ? col.bg : "rgba(255,255,255,0.04)", border: `1px solid ${activeCount > 0 && !resetting ? col.border : "rgba(255,255,255,0.08)"}`, borderRadius: 7, color: activeCount > 0 && !resetting ? col.text : "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 700, cursor: activeCount > 0 && !resetting ? "pointer" : "not-allowed", fontFamily: sans, transition: "all 0.2s" }}
                        >
                          {isResetting ? "Resetting…" : activeCount === 0 ? "Already Clear" : "Reset →"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* State snapshot */}
            <div style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: ".1em", marginBottom: 12, fontFamily: mono }}>
                CURRENT STATE SNAPSHOT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {RESET_KEYS.map(({ key, label, icon }) => {
                  const active = lsState[key];
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 7, background: active ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${active ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)"}` }}>
                      <span style={{ fontSize: 13 }}>{icon}</span>
                      <span style={{ flex: 1, fontSize: 11, color: active ? "#e2e8f0" : "rgba(255,255,255,0.25)" }}>{label}</span>
                      <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 700, letterSpacing: ".08em", padding: "2px 7px", borderRadius: 4, background: active ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)", color: active ? "#fbbf24" : "rgba(255,255,255,0.2)", border: `1px solid ${active ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                        {active ? "SET" : "EMPTY"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button onClick={refreshState} style={{ marginTop: 12, width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "7px 0", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: sans, letterSpacing: ".05em" }}>
                ↻ Refresh State
              </button>
            </div>
          </div>

          {/* Right: Activity log */}
          <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 400 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#161b22", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 10, fontFamily: mono, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: ".1em" }}>RESET ACTIVITY LOG</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
              {log.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.15)", fontSize: 12, fontFamily: mono }}>
                  No actions yet
                </div>
              ) : (
                log.map((entry, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, animation: i === 0 ? "logline 0.15s ease-out" : "none" }}>
                    <span style={{ fontSize: 10, fontFamily: mono, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{entry.ts}</span>
                    <span style={{ fontSize: 11, fontFamily: mono, color: entry.ok ? "#4ade80" : "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{entry.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick instructions */}
        <div style={{ marginTop: 20, background: "#161b22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: ".1em", marginBottom: 12, fontFamily: mono }}>ROUND RESET CHECKLIST</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { step: "01", text: "Click \"Reset All\" to clear all CTF state from this browser." },
              { step: "02", text: "Have all team members refresh the defense dashboard to resync." },
              { step: "03", text: "Red team can now start exploiting all vulnerabilities again." },
            ].map(({ step, text }) => (
              <div key={step} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "rgba(245,130,10,0.3)", fontFamily: mono, marginBottom: 6 }}>{step}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap");
        * { box-sizing: border-box; }
        body { margin: 0; background: #0d1117; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes logline { from{opacity:0;transform:translateX(-4px)} to{opacity:1;transform:none} }
        button:focus { outline: none; }
      `}</style>
    </div>
  );
}
