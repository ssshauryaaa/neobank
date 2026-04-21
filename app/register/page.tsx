"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) router.push("/login");
      else
        setError(
          data.message || "Could not create account. Try a different username.",
        );
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      {/* Embedded Styles for standard UI/UX patterns (Matching Login Page) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #ffffff;
        }

        .fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .premium-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          color: #111827;
          background: #f9fafb;
          transition: all 0.2s ease;
          outline: none;
          font-family: inherit;
        }

        .premium-input:focus {
          background: #ffffff;
          border-color: #111827;
          box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
        }

        .premium-input::placeholder {
          color: #9ca3af;
        }

        .premium-btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          background: #111827;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .premium-btn:hover:not(:disabled) {
          background: #1f2937;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .premium-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .text-link {
          color: #6b7280;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .text-link:hover {
          color: #111827;
        }

        .right-panel-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0;
          border-top: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        
        .right-panel-stat:hover {
          border-top: 1px solid rgba(255,255,255,0.25);
          transform: translateX(4px);
        }

        @media (max-width: 900px) {
          .right-panel { display: none !important; }
          .left-panel { padding: 32px !important; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#ffffff" }}>
        
        {/* ── Left Panel (Form) ── */}
        <div className="left-panel" style={{
          flex: "1 1 50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px"
        }}>
          <div className="fade-in" style={{ width: "100%", maxWidth: "420px" }}>
            
            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "48px", textDecoration: "none", color: "#111827" }}>
              <div style={{ width: "32px", height: "32px", background: "#111827", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: "18px", letterSpacing: "-0.03em" }}>neobank.</span>
            </Link>

            <h1 style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.03em", color: "#111827", marginBottom: "8px" }}>
              Create your account
            </h1>
            <p style={{ fontSize: "15px", color: "#6b7280", marginBottom: "32px" }}>
              Free to open. No hidden fees. Start in seconds.
            </p>

            {/* ── Generic error ── */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px 16px", fontSize: "14px", color: "#b91c1c", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px", animation: "fadeIn 0.3s ease" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" flexShrink={0}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                  Username
                </label>
                <input
                  className="premium-input"
                  type="text"
                  placeholder="Choose a unique username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                  Email address
                </label>
                <input
                  className="premium-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: "32px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                  Password
                </label>
                <input
                  className="premium-input"
                  type="password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <button
                className="premium-btn"
                type="submit"
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" style={{ animation: "spin 1s linear infinite" }} width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Creating account...
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "32px", fontSize: "14px", color: "#6b7280" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#111827", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>

            <p style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>
              By continuing, you agree to our{" "}
              <a href="#" className="text-link" style={{ textDecoration: "underline" }}>Terms of Service</a> and{" "}
              <a href="#" className="text-link" style={{ textDecoration: "underline" }}>Privacy Policy</a>.
            </p>
          </div>
        </div>

        {/* ── Right Panel (Brand) ── */}
        <div className="right-panel" style={{
          flex: "1 1 50%",
          background: "#09090b",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          color: "white"
        }}>
          {/* Abstract Ambient Gradients */}
          <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(0,0,0,0) 70%)", borderRadius: "50%", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-20%", right: "-20%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(0,0,0,0) 70%)", borderRadius: "50%", pointerEvents: "none" }} />
          
          <div className="fade-in" style={{ position: "relative", zIndex: 1, marginTop: "auto", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "48px", fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: "24px" }}>
              A new era <br />
              <span style={{ color: "#a1a1aa", fontStyle: "normal" }}>of modern banking.</span>
            </h2>
            <p style={{ color: "#a1a1aa", fontSize: "18px", lineHeight: 1.6, maxWidth: "400px", fontWeight: 400 }}>
              Join millions of users worldwide who have already taken complete control of their financial future.
            </p>
          </div>

          <div className="fade-in" style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", animationDelay: "0.2s" }}>
            {[
              { n: "$0", label: "Monthly maintenance fees" },
              { n: "150+", label: "Countries supported natively" },
              { n: "24/7", label: "Concierge customer support" },
            ].map((stat) => (
              <div key={stat.n} className="right-panel-stat">
                <span style={{ color: "#a1a1aa", fontSize: "15px", fontWeight: 500 }}>
                  {stat.label}
                </span>
                <span style={{ color: "white", fontWeight: 600, fontSize: "22px", letterSpacing: "-0.02em" }}>
                  {stat.n}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}