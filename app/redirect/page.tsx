"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const PATCH_KEY = "patched_open_redirect";

const ALLOWED_PATHS = ["/dashboard", "/profile", "/transactions", "/settings", "/transfer"];

function pushRedirectAttack(destination: string, blocked: boolean) {
  const entry = {
    id: Math.random().toString(36).slice(2, 10).toUpperCase(),
    ts: Date.now(),
    type: "open_redirect",
    severity: "high",
    ip: "REAL ATTACKER",
    port: 443,
    user: "anon",
    detail: blocked
      ? `✦ REAL ATTACK — Open redirect to "${destination}" was BLOCKED by allowlist`
      : `✦ REAL ATTACK — Open redirect to external URL: "${destination}" (unvalidated)`,
    endpoint: "/redirect",
    method: "GET",
    statusCode: blocked ? 403 : 302,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) : "",
    payload: `?next=${destination}`,
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

function RedirectPageInner() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || "/dashboard";

  const [isPatched, setIsPatched] = useState(false);
  const [status, setStatus] = useState<"idle" | "blocked" | "redirecting">("idle");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const check = () => setIsPatched(localStorage.getItem(PATCH_KEY) === "1");
    check();
    const iv = setInterval(check, 800);
    return () => clearInterval(iv);
  }, []);

  const isExternal = /^https?:\/\//i.test(rawNext) || rawNext.startsWith("//");
  const isInternalAllowed = ALLOWED_PATHS.includes(rawNext);
  const isMalicious = isExternal || (!isInternalAllowed && !rawNext.startsWith("/"));

  useEffect(() => {
    if (status !== "idle") return;
    if (!isMalicious) {
      // Safe internal path — always redirect
      setStatus("redirecting");
    } else if (isPatched) {
      // Malicious + patched → block
      pushRedirectAttack(rawNext, true);
      setStatus("blocked");
    } else {
      // Malicious + unpatched → allow (log and redirect)
      pushRedirectAttack(rawNext, false);
      setStatus("redirecting");
    }
  }, [isPatched, rawNext, isMalicious, status]);

  useEffect(() => {
    if (status !== "redirecting") return;
    if (countdown <= 0) {
      window.location.href = rawNext;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, rawNext]);

  const displayDest = rawNext.length > 60 ? rawNext.slice(0, 57) + "..." : rawNext;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f5f7fa; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 480, animation: "fadeUp .4s ease" }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10, color: "#111827" }}>
              <div style={{ width: 36, height: 36, background: "#111827", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.03em" }}>neobank.</span>
            </Link>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: 40, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>

            {/* BLOCKED state */}
            {status === "blocked" && (
              <>
                <div style={{ width: 56, height: 56, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", textAlign: "center", marginBottom: 12, letterSpacing: "-0.02em" }}>
                  Redirect Blocked
                </h1>
                <p style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
                  This link attempted to redirect you to an external destination. Your security patch intercepted it.
                </p>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", letterSpacing: ".06em", marginBottom: 4 }}>BLOCKED DESTINATION</div>
                  <code style={{ fontSize: 12, color: "#b91c1c", wordBreak: "break-all" }}>{rawNext}</code>
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#15803d", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>✅</span>
                  <span>Open Redirect patch active — allowlist enforced. Attack logged to defense console.</span>
                </div>
                <Link href="/dashboard" style={{ display: "block", marginTop: 24, textAlign: "center", background: "#111827", color: "#fff", padding: "12px", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
                  Return to Dashboard
                </Link>
              </>
            )}

            {/* REDIRECTING state */}
            {status === "redirecting" && (
              <>
                <div style={{ width: 56, height: 56, background: isExternal ? "#fef2f2" : "#eff6ff", border: `1px solid ${isExternal ? "#fecaca" : "#bae6fd"}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", position: "relative" }}>
                  <svg style={{ animation: "spin 1.2s linear infinite" }} width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke={isExternal ? "#fca5a5" : "#bae6fd"} strokeWidth="2.5" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke={isExternal ? "#ef4444" : "#3b82f6"} strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", textAlign: "center", marginBottom: 12, letterSpacing: "-0.02em" }}>
                  Redirecting you...
                </h1>
                <p style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
                  You will be redirected in <strong style={{ color: "#111827" }}>{countdown}s</strong>
                </p>
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: ".06em", marginBottom: 4 }}>DESTINATION</div>
                  <code style={{ fontSize: 12, color: "#374151", wordBreak: "break-all" }}>{displayDest}</code>
                </div>
                {isExternal && !isPatched && (
                  <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#c2410c", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span>⚠️</span>
                    <span><strong>Vulnerability active:</strong> This page is not validating the redirect destination. An attacker can send anyone to any URL via this link.</span>
                  </div>
                )}
              </>
            )}

            {/* IDLE fallback */}
            {status === "idle" && (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Preparing redirect...</div>
            )}
          </div>

          {/* Vuln hint strip */}
          <div style={{ marginTop: 20, background: isPatched ? "#f0fdf4" : "#fff7ed", border: `1px solid ${isPatched ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: isPatched ? "#22c55e" : "#f59e0b", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: isPatched ? "#15803d" : "#92400e", fontFamily: "monospace" }}>
              {isPatched
                ? "Open Redirect: PATCHED (allowlist enforced)"
                : "Open Redirect: VULNERABLE (try /redirect?next=https://google.com)"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function RedirectPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <RedirectPageInner />
    </Suspense>
  );
}
