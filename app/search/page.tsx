"use client";

// ' OR '1'='1
// ' OR 1=1 --

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useTheme } from "../../components/ThemeProvider";

export default function SearchPage() {
  const { isDark } = useTheme();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Dynamic theme colors matching your global design system
  const theme = {
    bgMain: isDark ? "#000000" : "#F9F8F6",
    textMain: isDark ? "#EDEDED" : "#1A1A1A",
    textSub: isDark ? "#A1A1AA" : "#70685C",
    cardBg: isDark ? "#0A0A0A" : "white",
    borderMain: isDark ? "#27272A" : "#EDEAE4",
    btnBg: isDark ? "#EDEDED" : "#1A1A1A",
    btnText: isDark ? "#0A0A0A" : "white",
    debugBg: isDark ? "#111111" : "#F1EFE9",
    debugText: isDark ? "#71717A" : "#B8B2A7",
    resultHeaderBg: isDark ? "#111111" : "#F9F8F6",
    resultBorder: isDark ? "#27272A" : "#F5F3EF",
    avatarBg: isDark ? "#EDEDED" : "#1A1A1A",
    avatarText: isDark ? "#0A0A0A" : "white",
    sendBtnBg: isDark ? "#111111" : "#F9F8F6",
    sendBtnText: isDark ? "#EDEDED" : "#1A1A1A",
    leakText: isDark ? "#52525B" : "#D1CEC7",
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success) setResults(data.results || []);
      else setResults([]);
    } catch {
      setResults([]);
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
          overflowY: "auto",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header Section */}
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
            Find People
          </h1>
          <p style={{ fontSize: 16, color: theme.textSub }}>
            Search for other Neobank users to send money instantly.
          </p>

          {/* Debug Hint */}
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: theme.debugText,
              fontFamily: "monospace",
              background: theme.debugBg,
              padding: "4px 10px",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            // DEBUG: RAW_QUERY_MODE_ENABLED
          </div>
        </header>

        {/* Search Input Card */}
        <section
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.borderMain}`,
            borderRadius: 24,
            padding: "32px",
            marginBottom: 32,
            maxWidth: "700px",
            boxShadow: isDark ? "none" : "0 4px 12px rgba(132, 125, 110, 0.04)",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Enter username or account ID..."
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  borderRadius: 16,
                  fontSize: 15,
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                className="search-input"
              />
            </div>
            <button
              onClick={runSearch}
              disabled={loading}
              style={{
                padding: "0 28px",
                background: theme.btnBg,
                color: theme.btnText,
                border: "none",
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "transform 0.1s active",
              }}
            >
              {loading ? "..." : "Search"}
            </button>
          </div>
        </section>

        {/* Results Section */}
        {searched && (
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.borderMain}`,
              borderRadius: 24,
              overflow: "hidden",
              maxWidth: "700px",
              boxShadow: isDark
                ? "none"
                : "0 8px 24px rgba(132, 125, 110, 0.08)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: `1px solid ${theme.resultBorder}`,
                background: theme.resultHeaderBg,
              }}
            >
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#8A7F6E",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Search Results ({results.length})
              </h3>
            </div>

            {results.length === 0 ? (
              <div
                style={{
                  padding: "48px 32px",
                  textAlign: "center",
                  fontSize: 15,
                  color: theme.textSub,
                }}
                /* 🔥 Reflected XSS Point */
                dangerouslySetInnerHTML={{
                  __html: `No users found matching "<strong>${query}</strong>"`,
                }}
              />
            ) : (
              results.map((u, i) => (
                <div
                  key={i}
                  style={{
                    padding: "20px 24px",
                    borderBottom:
                      i < results.length - 1
                        ? `1px solid ${theme.resultBorder}`
                        : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background 0.2s",
                  }}
                  className="result-row"
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    {/* Avatar Circle */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "14px",
                        background: theme.avatarBg,
                        color: theme.avatarText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {String(u.username || u[1] || "?")[0]?.toUpperCase()}
                    </div>

                    <div>
                      {/* 🔥 Stored XSS Point */}
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          marginBottom: 2,
                          color: theme.textMain,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: u.username || u[1],
                        }}
                      />

                      {/* Data leakage Point */}
                      <div style={{ fontSize: 13, color: theme.textSub }}>
                        {u.email || u[2]}
                      </div>

                      {/* Hidden Debug Leak */}
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          color: theme.leakText,
                          fontFamily: "monospace",
                          maxWidth: "250px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        RAW: {JSON.stringify(u)}
                      </div>
                    </div>
                  </div>

                  {/* IDOR helper link */}
                  <a
                    href={`/transfer?to=${u.account_number || ""}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: theme.sendBtnText,
                      textDecoration: "none",
                      padding: "10px 18px",
                      background: theme.sendBtnBg,
                      border: `1px solid ${theme.borderMain}`,
                      borderRadius: 12,
                      transition: "all 0.2s",
                    }}
                    className="send-btn"
                  >
                    Send Money →
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        /* Dynamic Input Styles */
        [data-theme="light"] .search-input {
          background: #f9f8f6;
          border: 1px solid #edeae4;
          color: #1a1a1a;
        }
        [data-theme="light"] .search-input:focus {
          border-color: #1a1a1a;
          background: white;
          box-shadow: 0 0 0 4px rgba(26, 26, 26, 0.05);
        }

        [data-theme="dark"] .search-input {
          background: #111111;
          border: 1px solid #27272a;
          color: #ededed;
        }
        [data-theme="dark"] .search-input:focus {
          border-color: #ededed;
          background: #000000;
          box-shadow: 0 0 0 4px rgba(237, 237, 237, 0.1);
        }

        .search-input::placeholder {
          color: #8a7f6e;
        }

        /* Hover States */
        [data-theme="light"] .result-row:hover {
          background-color: #fafaf9;
        }
        [data-theme="dark"] .result-row:hover {
          background-color: #111111;
        }

        [data-theme="light"] .send-btn:hover {
          background-color: #1a1a1a;
          color: white !important;
          border-color: #1a1a1a;
        }
        [data-theme="dark"] .send-btn:hover {
          background-color: #ededed;
          color: #0a0a0a !important;
          border-color: #ededed;
        }
      `}</style>
    </div>
  );
}
