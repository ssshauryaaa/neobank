"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

function signJwt(payload: object, secret: string) {
  const encode = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  const header = { alg: "HS256", typ: "JWT" };
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const signature = btoa(secret + "." + unsigned)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${unsigned}.${signature}`;
}

function decodePayload(token: string): any {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

type Stage = "idle" | "editing" | "forging" | "success" | "error";

export default function ProfilePage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState("");
  const [editedPayload, setEditedPayload] = useState("");
  const [parseError, setParseError] = useState("");
  const [secret, setSecret] = useState("secret");
  const [forgedToken, setForgedToken] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [forgedUser, setForgedUser] = useState<any>(null);
  const [apiError, setApiError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic theme colors
  const theme = {
    bgMain: isDark ? "#000000" : "#F9F8F6",
    textMain: isDark ? "#EDEDED" : "#1A1A1A",
    textSub: isDark ? "#A1A1AA" : "#8A7F6E",
    cardBg: isDark ? "#0A0A0A" : "white",
    borderMain: isDark ? "#27272A" : "#EDEAE4",
    gridBorder: isDark ? "#1A1A1A" : "#F0EDE6",
    inputBg: isDark ? "#111111" : "#F9F8F6",
    inputText: isDark ? "#EDEDED" : "#1A1A1A",
    accent: isDark ? "#EDEDED" : "#1A1A1A",
    accentText: isDark ? "#0A0A0A" : "white",
    cardHeader: isDark ? "#111111" : "#1A1A1A",
    forgedBanner: isDark ? "#1c1910" : "#FFF3CD",
    forgedBannerText: isDark ? "#FACC15" : "#92710A",
    forgedBannerBorder: isDark ? "#422006" : "#F5D76E",
  };

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    setToken(tok);
    const pl = decodePayload(tok);
    if (pl) setEditedPayload(JSON.stringify(pl, null, 2));

    const savedForgedUser = localStorage.getItem("forgedUser");
    const savedStage = localStorage.getItem("stage");
    const savedForgedToken = localStorage.getItem("forgedToken");
    if (savedForgedUser) setForgedUser(JSON.parse(savedForgedUser));
    if (savedForgedToken) setForgedToken(savedForgedToken);
    if (savedStage) setStage(savedStage as Stage);

    const activeTok = savedForgedToken || tok;
    document.cookie = `token=${activeTok}; path=/; SameSite=Lax`;

    fetch("/api/user", { headers: { Authorization: `Bearer ${activeTok}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setUser(data.user);
          const decodedNow = decodePayload(activeTok);
          if (
            decodedNow?.id !== data.user.id ||
            decodedNow?.role !== data.user.role
          ) {
            setForgedUser(data.user);
            setStage("success");
            localStorage.setItem("forgedUser", JSON.stringify(data.user));
            localStorage.setItem("stage", "success");
          } else if (!savedForgedToken) {
            setForgedUser(null);
            setStage("idle");
            localStorage.removeItem("forgedUser");
            localStorage.setItem("stage", "idle");
          }
        }
      })
      .catch(() => setStage("error"));
  }, [router]);

  const handlePayloadEdit = (val: string) => {
    setEditedPayload(val);
    setParseError("");
    setStage("editing");
    try {
      JSON.parse(val);
    } catch {
      setParseError("Invalid JSON");
    }
  };

  const forgeAndFetch = async () => {
    try {
      setStage("forging");
      const payload = JSON.parse(editedPayload);
      const forged = signJwt(payload, secret);
      setForgedToken(forged);
      const res = await fetch("/api/user", {
        headers: { Authorization: `Bearer ${forged}` },
      });
      const data = await res.json();
      if (data.success) {
        setForgedUser(data.user);
        setStage("success");
        document.cookie = `token=${forged}; path=/; SameSite=Lax`;
        localStorage.setItem("forgedUser", JSON.stringify(data.user));
        localStorage.setItem("stage", "success");
        localStorage.setItem("forgedToken", forged);
      } else {
        setApiError(data.message || "Request failed");
        setStage("error");
      }
    } catch {
      setStage("error");
      setApiError("Invalid payload or request failed");
    }
  };

  const reset = () => {
    const pl = decodePayload(token);
    setEditedPayload(JSON.stringify(pl, null, 2));
    setForgedToken("");
    setForgedUser(null);
    setApiError("");
    setStage("idle");
    document.cookie = `token=${token}; path=/; SameSite=Lax`;
    localStorage.removeItem("forgedUser");
    localStorage.removeItem("stage");
    localStorage.removeItem("forgedToken");
  };

  const displayUser = forgedUser || user;

  const stagePill: Record<
    Stage,
    { bg: string; text: string; dot: string; label: string }
  > = {
    idle: {
      bg: isDark ? "#18181B" : "#F2F0EC",
      text: isDark ? "#A1A1AA" : "#70685C",
      dot: isDark ? "#3F3F46" : "#C5C0B8",
      label: "Waiting",
    },
    editing: {
      bg: isDark ? "#422006" : "#FFFBEB",
      text: isDark ? "#FBBF24" : "#92710A",
      dot: "#F0B429",
      label: "Editing",
    },
    forging: {
      bg: isDark ? "#172554" : "#EFF6FF",
      text: isDark ? "#60A5FA" : "#1D4ED8",
      dot: "#60A5FA",
      label: "Forging…",
    },
    success: {
      bg: isDark ? "#064e3b" : "#F0FDF4",
      text: isDark ? "#4ADE80" : "#15803D",
      dot: "#4ADE80",
      label: "Accepted ✓",
    },
    error: {
      bg: isDark ? "#450a0a" : "#FFF1F2",
      text: isDark ? "#FB7185" : "#BE123C",
      dot: "#FB7185",
      label: "Rejected ✗",
    },
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme.bgMain,
        fontFamily: "Inter, sans-serif",
        color: theme.textMain,
        transition: "all 0.3s ease",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: "48px 56px",
          overflowY: "auto",
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* ── Header ── */}
        <header style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  marginBottom: 4,
                  margin: 0,
                  color: theme.textMain,
                }}
              >
                Your Profile
              </h1>
              <p style={{ fontSize: 14, color: theme.textSub, marginTop: 6 }}>
                Manage your identity and security settings.
              </p>
            </div>
            {forgedUser && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: theme.forgedBanner,
                  border: `1px solid ${theme.forgedBannerBorder}`,
                  borderRadius: 10,
                  padding: "8px 14px",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#F0B429",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: theme.forgedBannerText,
                    letterSpacing: ".04em",
                  }}
                >
                  FORGED SESSION ACTIVE
                </span>
                <button
                  onClick={reset}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.forgedBannerText,
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 0,
                    marginLeft: 4,
                    fontWeight: 600,
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── Identity Card ── */}
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${forgedUser ? (isDark ? "#065f46" : "#C3E6CB") : theme.borderMain}`,
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 20,
            boxShadow: forgedUser
              ? `0 0 0 3px ${isDark ? "rgba(52,211,153,0.1)" : "rgba(40,167,69,0.08)"}`
              : isDark
                ? "none"
                : "0 2px 8px rgba(132,125,110,0.06)",
            transition: "all .4s",
          }}
        >
          {/* Card top strip */}
          <div
            style={{
              background: forgedUser
                ? isDark
                  ? "#064e3b"
                  : "#1A3A1A"
                : theme.cardHeader,
              padding: "28px 32px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              transition: "background .4s",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 800,
                color: "white",
                border: "2px solid rgba(255,255,255,0.15)",
                flexShrink: 0,
              }}
            >
              {displayUser?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "white",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {displayUser?.username || "—"}
                </span>
                {displayUser?.role === "admin" && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(255,255,255,0.15)",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: 5,
                      letterSpacing: ".06em",
                    }}
                  >
                    ADMIN
                  </span>
                )}
                {forgedUser && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: "#4ADE80",
                      color: "#14532D",
                      padding: "2px 8px",
                      borderRadius: 5,
                      letterSpacing: ".06em",
                    }}
                  >
                    FORGED
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                {displayUser?.email}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 4,
                }}
              >
                Balance
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "white",
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                $
                {parseFloat(displayUser?.balance || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Card bottom grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 0,
            }}
          >
            {[
              { label: "Account Number", value: displayUser?.account_number },
              {
                label: "Role",
                value:
                  displayUser?.role === "admin"
                    ? "⚡ Administrator"
                    : "Premium Personal",
              },
              {
                label: "Member Since",
                value: displayUser?.created_at
                  ? new Date(displayUser.created_at).toLocaleDateString(
                      "en-US",
                      { month: "long", year: "numeric" },
                    )
                  : "—",
              },
            ].map((item, i, arr) => (
              <div
                key={item.label}
                style={{
                  padding: "20px 24px",
                  borderRight:
                    i < arr.length - 1
                      ? `1px solid ${theme.gridBorder}`
                      : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: theme.textSub,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: 6,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: theme.textMain,
                  }}
                >
                  {item.value || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Security + Notifications ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 20,
          }}
        >
          {[
            {
              title: "Security",
              items: [
                "Change password",
                "Two-factor authentication",
                "Active sessions",
              ],
            },
            {
              title: "Notifications",
              items: [
                "Email alerts",
                "Push notifications",
                "Monthly statements",
              ],
            },
          ].map((section) => (
            <div
              key={section.title}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.borderMain}`,
                borderRadius: 20,
                padding: "24px 28px",
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 16,
                  letterSpacing: "-0.01em",
                  color: theme.textMain,
                }}
              >
                {section.title}
              </h3>
              {section.items.map((item, i, arr) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "13px 0",
                    borderBottom:
                      i < arr.length - 1
                        ? `1px solid ${isDark ? "#1A1A1A" : "#F5F3EF"}`
                        : "none",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    color: theme.textSub,
                  }}
                >
                  {item}
                  <span
                    style={{
                      color: isDark ? "#3F3F46" : "#D1CDC7",
                      fontSize: 16,
                    }}
                  >
                    ›
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── JWT Exploit Lab ── */}
        <div
          style={{
            background: theme.cardBg,
            border: `1.5px solid ${theme.accent}`,
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {/* Lab header bar */}
          <div
            style={{
              background: theme.accent,
              padding: "16px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#F87171",
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#FBBF24",
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#4ADE80",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  marginLeft: 8,
                }}
              >
                JWT Payload Editor
              </span>
            </div>

            {/* Stage pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: isDark
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(255,255,255,0.08)",
                padding: "5px 12px",
                borderRadius: 20,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: stagePill[stage].dot,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)",
                  letterSpacing: ".04em",
                }}
              >
                {stagePill[stage].label}
              </span>
            </div>
          </div>

          <div style={{ padding: "28px" }}>
            <p
              style={{
                fontSize: 13,
                color: theme.textSub,
                lineHeight: 1.6,
                marginBottom: 24,
                marginTop: 0,
              }}
            >
              Edit the JWT payload below and re-sign it. The server trusts the
              forged token because it was signed with the leaked secret.
            </p>

            {/* Side-by-side editor */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: theme.textSub,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 8,
                  }}
                >
                  Payload (editable)
                </div>
                <textarea
                  ref={textareaRef}
                  value={editedPayload}
                  onChange={(e) => handlePayloadEdit(e.target.value)}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    height: 180,
                    padding: 14,
                    fontFamily: "monospace",
                    fontSize: 12,
                    lineHeight: 1.7,
                    background: parseError
                      ? isDark
                        ? "#450a0a"
                        : "#FFF5F5"
                      : theme.inputBg,
                    border: `1.5px solid ${parseError ? "#FCA5A5" : theme.borderMain}`,
                    borderRadius: 10,
                    resize: "none",
                    outline: "none",
                    color: theme.inputText,
                    boxSizing: "border-box",
                    transition: "border-color .2s",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: theme.textSub,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 8,
                  }}
                >
                  Original Token
                </div>
                <div
                  style={{
                    padding: 14,
                    background: theme.inputBg,
                    border: `1px solid ${theme.borderMain}`,
                    borderRadius: 10,
                    minHeight: 180,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {token &&
                    token.split(".").map((part, i) => (
                      <div key={i}>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: theme.textSub,
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                            marginBottom: 3,
                          }}
                        >
                          {["Header", "Payload", "Signature"][i]}
                        </div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 10,
                            wordBreak: "break-all",
                            lineHeight: 1.5,
                            color: ["#DC2626", "#2563EB", "#16A34A"][i],
                          }}
                        >
                          {part}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={forgeAndFetch}
                disabled={!!parseError || stage === "forging"}
                style={{
                  padding: "10px 22px",
                  borderRadius: 9,
                  background: parseError
                    ? isDark
                      ? "#27272A"
                      : "#E0DDD7"
                    : theme.accent,
                  color: parseError ? theme.textSub : theme.accentText,
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: parseError ? "not-allowed" : "pointer",
                  transition: "all .2s",
                  letterSpacing: ".01em",
                }}
              >
                {stage === "forging" ? "Forging…" : "Forge & Verify"}
              </button>
              {stage !== "idle" && (
                <button
                  onClick={reset}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.textSub,
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Forged token display */}
            {forgedToken && (
              <div
                style={{
                  marginTop: 16,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: `1px solid ${isDark ? "#065f46" : "#BBF7D0"}`,
                }}
              >
                <div
                  style={{
                    background: isDark ? "#064e3b" : "#F0FDF4",
                    padding: "8px 14px",
                    borderBottom: `1px solid ${isDark ? "#065f46" : "#BBF7D0"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#4ADE80",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isDark ? "#4ade80" : "#15803D",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                    }}
                  >
                    Generated Forged Token
                  </span>
                </div>
                <div
                  style={{
                    padding: 14,
                    background: isDark ? "#022c22" : "#F9FFF9",
                    fontFamily: "monospace",
                    fontSize: 10,
                    wordBreak: "break-all",
                    lineHeight: 1.8,
                    color: theme.textMain,
                  }}
                >
                  {forgedToken}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Forged User Result ── */}
        {forgedUser && (
          <div
            style={{
              background: isDark ? "#064e3b" : "#F0FDF4",
              border: `1.5px solid ${isDark ? "#059669" : "#86EFAC"}`,
              borderRadius: 20,
              overflow: "hidden",
              animation: "fadeIn .4s ease",
            }}
          >
            <div
              style={{
                padding: "14px 24px",
                borderBottom: `1px solid ${isDark ? "#065f46" : "#BBF7D0"}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#22C55E",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isDark ? "#4ade80" : "#15803D",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                Server Response — User Data Returned
              </span>
            </div>
            <div
              style={{
                padding: 20,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
              }}
            >
              {Object.entries(forgedUser).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    padding: "12px 14px",
                    background: theme.cardBg,
                    borderRadius: 10,
                    border: `1px solid ${isDark ? "#065f46" : "#BBF7D0"}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: theme.textSub,
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                      marginBottom: 5,
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      wordBreak: "break-all",
                      color:
                        k === "role" && v === "admin"
                          ? "#EF4444"
                          : theme.textMain,
                    }}
                  >
                    {String(v)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
