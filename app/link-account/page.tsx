"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

const PATCH_KEY = "patched_ssrf";

const SSRF_PRESETS = [
  { label: "External (safe)", url: "https://jsonplaceholder.typicode.com/todos/1", risk: "low" },
  { label: "Internal API — /api/debug 🔴", url: "http://localhost:3000/api/debug", risk: "critical" },
  { label: "Internal API — /api/admin/users 🔴", url: "http://localhost:3000/api/admin/users", risk: "critical" },
  { label: "AWS Metadata 🔴", url: "http://169.254.169.254/latest/meta-data/", risk: "critical" },
  { label: "Loopback port scan 🔴", url: "http://127.0.0.1:3306", risk: "high" },
];

function pushSsrfAttack(url: string, blocked: boolean) {
  const entry = {
    id: Math.random().toString(36).slice(2, 10).toUpperCase(),
    ts: Date.now(),
    type: "ssrf",
    severity: "critical",
    ip: "REAL ATTACKER",
    port: 443,
    user: "self",
    detail: blocked
      ? `✦ REAL ATTACK — SSRF to "${url}" BLOCKED by private-IP denylist`
      : `✦ REAL ATTACK — SSRF fetched internal resource: "${url}"`,
    endpoint: "/api/fetch-url",
    method: "POST",
    statusCode: blocked ? 403 : 200,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) : "",
    payload: JSON.stringify({ url }),
    country: "LIVE",
    patched: blocked,
    detected: true,
  };
  try {
    const existing = JSON.parse(localStorage.getItem("real_attack_log") || "[]");
    existing.unshift(entry);
    localStorage.setItem("real_attack_log", JSON.stringify(existing.slice(0, 50)));
  } catch { /* ignore */ }
}

function isInternalUrl(url: string): boolean {
  return (
    /localhost/i.test(url) ||
    /127\.\d+\.\d+\.\d+/.test(url) ||
    /10\.\d+\.\d+\.\d+/.test(url) ||
    /192\.168\.\d+\.\d+/.test(url) ||
    /169\.254\.\d+\.\d+/.test(url) ||
    /0\.0\.0\.0/.test(url) ||
    /\[::1\]/.test(url) ||
    /^file:\/\//i.test(url)
  );
}

export default function LinkAccountPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [isPatched, setIsPatched] = useState(false);
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/todos/1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(0);
  const [attackLogged, setAttackLogged] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
  }, [router]);

  useEffect(() => {
    const check = () => setIsPatched(localStorage.getItem(PATCH_KEY) === "1");
    check();
    const iv = setInterval(check, 800);
    return () => clearInterval(iv);
  }, []);

  const t = {
    bg: isDark ? "#000" : "#f9f8f6",
    card: isDark ? "#0a0a0a" : "#fff",
    border: isDark ? "#27272a" : "#e5e7eb",
    text: isDark ? "#ededed" : "#111827",
    sub: isDark ? "#71717a" : "#6b7280",
    input: isDark ? "#111" : "#f9fafb",
  };

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");

    const internal = isInternalUrl(url);

    if (internal) {
      if (isPatched) {
        // Patched: block locally, log as blocked
        if (attackLogged !== url) { pushSsrfAttack(url, true); setAttackLogged(url); }
        setError("⛔ SSRF Blocked: This URL points to an internal/private IP address. The server-side denylist rejected the request before it was sent.");
        setLoading(false);
        return;
      } else {
        // Unpatched: allow through, log as attack
        if (attackLogged !== url) { pushSsrfAttack(url, false); setAttackLogged(url); }
      }
    }

    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    }
    setLoading(false);
  }

  const riskColor = { critical: "#ef4444", high: "#f97316", low: "#10b981" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "Inter, sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "48px 56px", maxWidth: 900, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ecfdf5", border: "1px solid #6ee7b7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Link External Account</h1>
          </div>
          <p style={{ fontSize: 14, color: t.sub, margin: 0, marginLeft: 48 }}>
            Connect your other bank accounts by providing their open banking API endpoint.
          </p>
        </header>


        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          {/* Left: Input panel */}
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* URL input */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.sub, letterSpacing: ".06em", marginBottom: 8 }}>
                ACCOUNT API ENDPOINT URL
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setActivePreset(null); }}
                  placeholder="https://api.externalbank.com/v1/accounts"
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, fontFamily: "monospace", outline: "none" }}
                />
              </div>
            </div>

            {/* Presets */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.sub, letterSpacing: ".06em", marginBottom: 10 }}>QUICK PRESETS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SSRF_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setUrl(p.url); setActivePreset(i); setResult(null); setError(""); }}
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: `1px solid ${activePreset === i ? (riskColor as any)[p.risk] + "60" : t.border}`,
                      background: activePreset === i ? (riskColor as any)[p.risk] + "10" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: activePreset === i ? (riskColor as any)[p.risk] : t.text }}>{p.label}</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: (riskColor as any)[p.risk], background: (riskColor as any)[p.risk] + "15", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>
                      {p.risk.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleFetch}
              disabled={loading}
              style={{
                padding: "13px",
                borderRadius: 12,
                background: loading ? "#6b7280" : "#065f46",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: ".02em",
                transition: "background .2s",
              }}
            >
              {loading ? "Fetching..." : "Fetch & Link Account →"}
            </button>

            {/* Lab hint */}
            <div style={{ background: isDark ? "#111" : "#fef9c3", border: `1px solid ${isDark ? "#27272a" : "#fde68a"}`, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: isDark ? "#a1a1aa" : "#92400e", lineHeight: 1.6 }}>
              <strong>🧪 Lab:</strong> The server fetches whatever URL you supply with no validation. Try the internal API presets above — the server will return their full response, exposing private data. When patched, a denylist blocks private IP ranges.
            </div>
          </div>

          {/* Right: Response viewer */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Terminal-style header */}
            <div style={{ background: isDark ? "#0a0a0a" : "#111827", border: `1px solid ${isDark ? "#27272a" : "#374151"}`, borderRadius: 16, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ background: isDark ? "#161616" : "#1f2937", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${isDark ? "#27272a" : "#374151"}` }}>
                {["#ef4444", "#fbbf24", "#4ade80"].map((c) => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", marginLeft: 6 }}>
                  POST /api/fetch-url — server response
                </span>
              </div>

              <div style={{ flex: 1, padding: 16, fontFamily: "monospace", fontSize: 12, overflowY: "auto", minHeight: 320, maxHeight: 480 }}>

                {!result && !error && !loading && (
                  <div style={{ color: "#4b5563", paddingTop: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 12 }}>⌨</div>
                    <div>Select a preset or enter a URL and click Fetch</div>
                  </div>
                )}

                {loading && (
                  <div style={{ color: "#4ade80", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                    <span>Fetching {url}...</span>
                  </div>
                )}

                {error && (
                  <div>
                    <div style={{ color: error.includes("BLOCKED") ? "#fbbf24" : "#ef4444", fontWeight: 700, marginBottom: 8 }}>
                      {error.includes("BLOCKED") ? "⛔ BLOCKED" : "✗ ERROR"}
                    </div>
                    <div style={{ color: error.includes("BLOCKED") ? "#fde68a" : "#fca5a5", lineHeight: 1.6 }}>{error}</div>
                    {error.includes("BLOCKED") && (
                      <div style={{ marginTop: 12, color: "#4ade80", fontSize: 11 }}>
                        ✅ SSRF patch active — private IP denylist rejected the request server-side. Attack logged to defense console.
                      </div>
                    )}
                  </div>
                )}

                {result && (
                  <div>
                    <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      <span style={{ color: result.success ? "#4ade80" : "#ef4444", fontWeight: 700 }}>
                        {result.success ? "✓ SUCCESS" : "✗ FAILED"}
                      </span>
                      {result.status && (
                        <span style={{ color: "#60a5fa" }}>HTTP {result.status}</span>
                      )}
                      {result.contentType && (
                        <span style={{ color: "#a78bfa" }}>{result.contentType.split(";")[0]}</span>
                      )}
                    </div>

                    {result.fetchedUrl && isInternalUrl(result.fetchedUrl) && !isPatched && (
                      <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, color: "#fca5a5", fontSize: 11 }}>
                        ⚠ SSRF SUCCESS — Server fetched an internal resource and returned its full response. An attacker can now read private APIs, internal configs, and cloud metadata.
                      </div>
                    )}

                    {result.body && (
                      <div>
                        <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 6 }}>RESPONSE BODY:</div>
                        <pre style={{ color: "#e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0, fontSize: 11, lineHeight: 1.6 }}>
                          {(() => {
                            try { return JSON.stringify(JSON.parse(result.body), null, 2); }
                            catch { return result.body; }
                          })()}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px);} to {opacity:1; transform:translateY(0);} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
