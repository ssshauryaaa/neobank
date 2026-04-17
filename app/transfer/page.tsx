"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

export default function TransferPage() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [form, setForm] = useState({ toAccount: "", amount: "", note: "" });
  const [lastTransfer, setLastTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  // Dynamic theme colors matching your global design system
  const theme = {
    bgMain: isDark ? "#000000" : "#F9F8F6",
    textMain: isDark ? "#EDEDED" : "#1A1A1A",
    textSub: isDark ? "#A1A1AA" : "#8A7F6E",
    cardBg: isDark ? "#0A0A0A" : "white",
    borderMain: isDark ? "#27272A" : "#EDEAE4",
    btnBg: isDark ? "#EDEDED" : "#1A1A1A",
    btnText: isDark ? "#0A0A0A" : "white",
    balanceCardBg: isDark ? "#111111" : "#1A1A1A",
    successBg: isDark ? "rgba(34, 197, 94, 0.1)" : "#F0FDF4",
    successBorder: isDark ? "rgba(34, 197, 94, 0.2)" : "#BBF7D0",
    successText: isDark ? "#4ADE80" : "#166534",
    errorBg: isDark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
    errorBorder: isDark ? "rgba(239, 68, 68, 0.2)" : "#FECACA",
    errorText: isDark ? "#F87171" : "#991B1B",
  };

  useEffect(() => {
    const token =
      localStorage.getItem("forgedToken") || localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("/api/user", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const token =
      localStorage.getItem("forgedToken") || localStorage.getItem("token");

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setLastTransfer(form);
        setSuccess(true);
        setForm({ toAccount: "", amount: "", note: "" });

        const fresh = await fetch("/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const freshData = await fresh.json();
        if (freshData.success) {
          setUser(freshData.user);
          localStorage.setItem("user", JSON.stringify(freshData.user));
        }
      } else {
        setError(data.message || "Transfer failed.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div
      data-theme={isDark ? "dark" : "light"}
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme.bgMain,
        fontFamily: "Inter, sans-serif",
        color: theme.textMain,
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: "48px 64px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 8,
              color: theme.textMain,
            }}
          >
            Send Money
          </h1>
          <p style={{ fontSize: 16, color: theme.textSub }}>
            Transfer funds to any Neobank account instantly.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: "40px",
            alignItems: "start",
          }}
        >
          {/* Main Transaction Card */}
          <div
            style={{
              background: theme.cardBg,
              borderRadius: 24,
              padding: "40px",
              border: `1px solid ${theme.borderMain}`,
              boxShadow: isDark
                ? "none"
                : "0 8px 24px rgba(132, 125, 110, 0.08)",
            }}
          >
            {success && lastTransfer && (
              <div
                style={{
                  background: theme.successBg,
                  border: `1px solid ${theme.successBorder}`,
                  borderRadius: 16,
                  padding: "16px 24px",
                  marginBottom: 32,
                  color: theme.successText,
                  fontSize: 14,
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 20 }}>✨</span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: `Transfer to <b>${lastTransfer.toAccount}</b> completed. Note: ${lastTransfer.note}`,
                  }}
                />
              </div>
            )}

            {error && (
              <div
                style={{
                  background: theme.errorBg,
                  border: `1px solid ${theme.errorBorder}`,
                  borderRadius: 16,
                  padding: "16px 24px",
                  marginBottom: 32,
                  color: theme.errorText,
                  fontSize: 14,
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <span>⚠️</span> {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: theme.textSub,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Recipient Account Number
                </label>
                <input
                  className="custom-input"
                  placeholder="e.g. 8829410"
                  value={form.toAccount}
                  onChange={(e) =>
                    setForm({ ...form, toAccount: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: theme.textSub,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Amount ($)
                </label>
                <input
                  className="custom-input"
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: theme.textSub,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Note (Optional)
                </label>
                <input
                  className="custom-input"
                  placeholder="Hint: <img src=x onerror=alert(document.cookie)>"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: theme.btnBg,
                  color: theme.btnText,
                  border: "none",
                  borderRadius: 16,
                  padding: "18px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "transform 0.1s active",
                  marginTop: "12px",
                }}
              >
                {loading ? "Processing Securely..." : "Confirm Transfer"}
              </button>
            </form>
          </div>

          {/* Balance Context Card */}
          <div style={{ position: "sticky", top: "48px" }}>
            <div
              style={{
                background: theme.balanceCardBg,
                padding: "32px",
                borderRadius: 24,
                color: "white",
                boxShadow: isDark ? "none" : "0 20px 40px rgba(0,0,0,0.1)",
                border: isDark ? `1px solid ${theme.borderMain}` : "none",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}
              >
                Available Balance
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  marginBottom: 24,
                }}
              >
                $
                {parseFloat(user?.balance || "0").toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  paddingTop: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Account ID
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 14 }}>
                  {user?.account_number || "••••••••"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: "0 12px" }}>
              <p
                style={{ fontSize: 13, color: theme.textSub, lineHeight: 1.5 }}
              >
                Funds are transferred instantly between Neobank accounts. Ensure
                the recipient ID is correct.
              </p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        /* Dynamic Input Styles for Light & Dark Mode */
        [data-theme="light"] .custom-input {
          background: #f9f8f6;
          border: 1px solid #edeae4;
          color: #1a1a1a;
        }
        [data-theme="light"] .custom-input:focus {
          border-color: #1a1a1a;
          background: white;
          box-shadow: 0 0 0 4px rgba(26, 26, 26, 0.05);
        }

        [data-theme="dark"] .custom-input {
          background: #111111;
          border: 1px solid #27272a;
          color: #ededed;
        }
        [data-theme="dark"] .custom-input:focus {
          border-color: #ededed;
          background: #000000;
          box-shadow: 0 0 0 4px rgba(237, 237, 237, 0.1);
        }

        .custom-input {
          width: 100%;
          padding: 16px 20px;
          border-radius: 16px;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .custom-input::placeholder {
          color: #8a7f6e;
        }
      `}</style>
    </div>
  );
}
