"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

const MA_PATCH_KEY = "patched_mass_assignment";

function pushMassAssignmentAttack(fields: string[], blocked: boolean) {
  const entry = {
    id: Math.random().toString(36).slice(2, 10).toUpperCase(),
    ts: Date.now(), type: "mass_assignment", severity: "high",
    ip: "REAL ATTACKER", port: 443, user: "self",
    detail: blocked
      ? `✦ REAL ATTACK — Mass Assignment BLOCKED: fields [${fields.join(", ")}] stripped by whitelist`
      : `✦ REAL ATTACK — Mass Assignment SUCCEEDED: fields [${fields.join(", ")}] accepted by /api/profile`,
    endpoint: "/api/profile", method: "PATCH", statusCode: blocked ? 200 : 200,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) : "",
    payload: JSON.stringify(Object.fromEntries(fields.map((f) => [f, f === "role" ? "admin" : "999999"]))),
    country: "LIVE", patched: blocked, detected: true,
  };
  try {
    const existing = JSON.parse(localStorage.getItem("real_attack_log") || "[]");
    existing.unshift(entry);
    localStorage.setItem("real_attack_log", JSON.stringify(existing.slice(0, 50)));
  } catch { /* ignore */ }
}

export default function SettingsPage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme(); // Global theme state
  const [user, setUser] = useState<any>(null);

  // Local state for all other settings
  const [settings, setSettings] = useState({
    compactView: false,
    hideBalance: false,
    activityStatus: true,
    requireConfirm: true,
    limitAlerts: true,
  });

  const [toastVisible, setToastVisible] = useState(false);

  // ── Mass Assignment state
  const [maPatched, setMaPatched] = useState(false);
  const [maName, setMaName]     = useState("");
  const [maEmail, setMaEmail]   = useState("");
  const [maRole, setMaRole]     = useState("");
  const [maBalance, setMaBalance] = useState("");
  const [injectRole, setInjectRole]     = useState(false);
  const [injectBalance, setInjectBalance] = useState(false);
  const [maResult, setMaResult] = useState<{ success: boolean; msg: string; user?: any } | null>(null);
  const [maSaving, setMaSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    const check = () => setMaPatched(localStorage.getItem(MA_PATCH_KEY) === "1");
    check();
    const iv = setInterval(check, 800);
    return () => clearInterval(iv);
  }, [router]);

  // Handle standard setting toggles
  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    showToast();
  };

  const showToast = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  // ── Mass Assignment submit
  async function handleMaSubmit() {
    setMaSaving(true);
    setMaResult(null);
    const token = localStorage.getItem("token");
    if (!token) { setMaSaving(false); return; }

    const body: Record<string, string> = {};
    if (maName)  body.username = maName;
    if (maEmail) body.email    = maEmail;

    const dangerousFields: string[] = [];
    if (injectRole)    { body.role    = maRole    || "admin";  dangerousFields.push("role"); }
    if (injectBalance) { body.balance = maBalance || "999999"; dangerousFields.push("balance"); }

    if (dangerousFields.length > 0) {
      if (maPatched) {
        // When patched: strip dangerous fields, log blocked attempt
        pushMassAssignmentAttack(dangerousFields, true);
        delete body.role;
        delete body.balance;
        setMaResult({ success: false, msg: `⛔ BLOCKED: Fields [${dangerousFields.join(", ")}] were stripped by the field whitelist. Only safe fields were sent.` });
        setMaSaving(false);
        return;
      } else {
        pushMassAssignmentAttack(dangerousFields, false);
      }
    }

    try {
      const res  = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        const u = data.user;
        localStorage.setItem("user", JSON.stringify(u));
        setUser(u);
        setMaResult({ success: true, msg: `✅ Profile updated! Role: ${u.role}, Balance: $${Number(u.balance).toLocaleString()}`, user: u });
      } else {
        setMaResult({ success: false, msg: `❌ ${data.message}` });
      }
    } catch {
      setMaResult({ success: false, msg: "❌ Request failed." });
    }
    setMaSaving(false);
  }

  // Reusable UI Components
  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <div>{children}</div>
    </div>
  );

  const Row = ({ label, desc, children, isLast = false }: any) => (
    <div
      style={{
        ...s.row,
        borderBottom: isLast ? "none" : `1px solid var(--border-sub)`,
      }}
    >
      <div style={s.rowText}>
        <div style={s.rowLabel}>{label}</div>
        {desc && <div style={s.rowDesc}>{desc}</div>}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        ...s.toggleTrack,
        background: on ? "var(--toggle-on)" : "var(--toggle-off)",
      }}
      aria-pressed={on}
    >
      <div
        style={{
          ...s.toggleThumb,
          transform: on ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );

  return (
    <div style={s.root}>
      <Sidebar />
      <main style={s.main}>
        {/* Toast Notification */}
        <div
          style={{
            ...s.toast,
            opacity: toastVisible ? 1 : 0,
            transform: toastVisible ? "translateY(0)" : "translateY(-10px)",
          }}
        >
          ✓ Settings updated
        </div>

        {/* Header */}
        <header style={s.header}>
          <h1 style={s.h1}>Settings</h1>
          <p style={s.sub}>Manage your account preferences and security.</p>
        </header>

        <div style={s.content}>
          <Section title="Appearance">
            <Row label="Dark mode" desc="Switch to a darker interface">
              <Toggle
                on={isDark}
                onClick={() => {
                  toggleTheme();
                  showToast();
                }}
              />
            </Row>
            <Row
              label="Compact view"
              desc="Show more information with less spacing"
              isLast
            >
              <Toggle
                on={settings.compactView}
                onClick={() => handleToggle("compactView")}
              />
            </Row>
          </Section>

          <Section title="Privacy">
            <Row
              label="Hide balance on overview"
              desc="Show asterisks instead of your actual balance"
            >
              <Toggle
                on={settings.hideBalance}
                onClick={() => handleToggle("hideBalance")}
              />
            </Row>
            <Row
              label="Activity status"
              desc="Let others see when you were last active"
              isLast
            >
              <Toggle
                on={settings.activityStatus}
                onClick={() => handleToggle("activityStatus")}
              />
            </Row>
          </Section>

          <Section title="Payments">
            <Row
              label="Require confirmation"
              desc="Ask for a final confirmation before sending money"
            >
              <Toggle
                on={settings.requireConfirm}
                onClick={() => handleToggle("requireConfirm")}
              />
            </Row>
            <Row
              label="Daily limit alerts"
              desc="Notify when you reach 80% of your daily limit"
              isLast
            >
              <Toggle
                on={settings.limitAlerts}
                onClick={() => handleToggle("limitAlerts")}
              />
            </Row>
          </Section>

          {/* ── Mass Assignment Exploit Lab ── */}
          <div style={{ background: "var(--bg-card)", border: "1.5px solid #6b21a8", borderRadius: 24, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ background: "#6b21a8", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {["#F87171", "#FBBF24", "#4ADE80"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: ".1em", textTransform: "uppercase" as const, marginLeft: 8 }}>Mass Assignment — Profile Update</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.2)", padding: "5px 14px", borderRadius: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: maPatched ? "#4ADE80" : "#F87171" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: ".04em" }}>{maPatched ? "PATCHED" : "VULNERABLE"}</span>
              </div>
            </div>
            <div style={{ padding: 32 }}>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 24, background: "#faf5ff", border: "1px solid #d8b4fe", borderRadius: 10, padding: "12px 16px" }}>
                <strong style={{ color: "#6b21a8" }}>🧪 Lab:</strong> The <code style={{ fontSize: 11, background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 3 }}>PATCH /api/profile</code> endpoint blindly applies <em>all</em> request body fields to the database.
                Enable the hidden toggles below to inject <code style={{ fontSize: 11, background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 3 }}>role</code> or <code style={{ fontSize: 11, background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 3 }}>balance</code> into the update.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {[{ label: "Display Name", val: maName, set: setMaName, ph: "New display name" }, { label: "Email", val: maEmail, set: setMaEmail, ph: "New email address" }].map(({ label, val, set, ph }) => (
                  <div key={label}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-main)", marginBottom: 6 }}>{label}</label>
                    <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-main)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: 13, outline: "none" }} />
                  </div>
                ))}
              </div>

              {/* Dangerous hidden fields */}
              <div style={{ border: "1px dashed #d8b4fe", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b21a8", letterSpacing: ".06em", marginBottom: 12 }}>⚡ DANGEROUS FIELDS (hidden from normal users)</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="checkbox" id="injectRole" checked={injectRole} onChange={(e) => setInjectRole(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#6b21a8" }} />
                    <label htmlFor="injectRole" style={{ fontSize: 13, fontWeight: 600, color: "#6b21a8", cursor: "pointer", flex: 1 }}>Inject <code style={{ background: "#f3e8ff", padding: "1px 5px", borderRadius: 3 }}>role</code> field</label>
                    <input value={maRole} onChange={(e) => setMaRole(e.target.value)} placeholder="admin" disabled={!injectRole} style={{ width: 120, padding: "7px 10px", borderRadius: 8, border: "1px solid #d8b4fe", background: injectRole ? "#faf5ff" : "#f3f4f6", color: "#6b21a8", fontSize: 12, fontFamily: "monospace", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="checkbox" id="injectBalance" checked={injectBalance} onChange={(e) => setInjectBalance(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#6b21a8" }} />
                    <label htmlFor="injectBalance" style={{ fontSize: 13, fontWeight: 600, color: "#6b21a8", cursor: "pointer", flex: 1 }}>Inject <code style={{ background: "#f3e8ff", padding: "1px 5px", borderRadius: 3 }}>balance</code> field</label>
                    <input value={maBalance} onChange={(e) => setMaBalance(e.target.value)} placeholder="999999" disabled={!injectBalance} style={{ width: 120, padding: "7px 10px", borderRadius: 8, border: "1px solid #d8b4fe", background: injectBalance ? "#faf5ff" : "#f3f4f6", color: "#6b21a8", fontSize: 12, fontFamily: "monospace", outline: "none" }} />
                  </div>
                </div>
              </div>

              <button onClick={handleMaSubmit} disabled={maSaving} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "#6b21a8", color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: maSaving ? "not-allowed" : "pointer", opacity: maSaving ? 0.7 : 1 }}>
                {maSaving ? "Sending..." : "Update Profile (PATCH /api/profile)"}
              </button>

              {maResult && (
                <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: maResult.success ? "#f0fdf4" : maResult.msg.includes("BLOCKED") ? "#fff7ed" : "#fef2f2", border: `1px solid ${maResult.success ? "#bbf7d0" : maResult.msg.includes("BLOCKED") ? "#fde68a" : "#fecaca"}`, fontSize: 13, color: maResult.success ? "#15803d" : maResult.msg.includes("BLOCKED") ? "#92400e" : "#b91c1c", lineHeight: 1.6 }}>
                  {maResult.msg}
                  {maResult.user && <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 11 }}>{JSON.stringify({ role: maResult.user.role, balance: maResult.user.balance }, null, 2)}</div>}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// Styles entirely powered by CSS Variables
const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, sans-serif",
    background: "var(--bg-main)",
    color: "var(--text-main)",
    transition: "background-color 0.3s ease, color 0.3s ease",
  },
  main: {
    flex: 1,
    padding: "48px 64px",
    overflowY: "auto",
    maxWidth: "1000px",
    margin: "0 auto",
    position: "relative",
  },
  toast: {
    position: "absolute",
    top: 48,
    right: 64,
    background: "#166534", // Kept explicitly green for success visibility
    color: "white",
    padding: "10px 16px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    transition: "all 0.3s ease",
    pointerEvents: "none",
    zIndex: 50,
  },
  header: { marginBottom: 40 },
  h1: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    marginBottom: 8,
    color: "var(--text-main)",
  },
  sub: { fontSize: 16, margin: 0, color: "var(--text-sub)" },
  content: { maxWidth: 720 },
  section: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-main)",
    borderRadius: 24,
    padding: "32px",
    marginBottom: 24,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
    transition: "background-color 0.3s ease, border-color 0.3s ease",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    marginBottom: 24,
    marginTop: 0,
    color: "var(--text-main)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 20,
    marginBottom: 20,
  },
  rowText: { paddingRight: 24, flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: 600, color: "var(--text-main)" },
  rowDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 1.4,
    color: "var(--text-desc)",
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: "none",
    display: "flex",
    alignItems: "center",
    padding: 2,
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "var(--bg-card)", // Inherits the card background so it looks perfect in light/dark mode
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition:
      "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease",
  },
};
