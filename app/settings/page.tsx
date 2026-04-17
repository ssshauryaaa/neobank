"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider"; // Adjust path if needed

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
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
