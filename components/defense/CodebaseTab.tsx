"use client";
import React, { useState, useEffect, useRef } from "react";
import { mono, sans } from "@/constants/theme";

type FileNode = {
  name: string; path?: string; children?: FileNode[];
  badge?: string; badgeColor?: string;
};

const FILE_TREE: FileNode[] = [
  { name: "lib", children: [
    { name: "auth.ts",      path: "lib/auth.ts",      badge: "VULN",   badgeColor: "#ef4444" },
    { name: "db.ts",        path: "lib/db.ts",         badge: "SCHEMA", badgeColor: "#8b5cf6" },
    { name: "logAttack.ts", path: "lib/logAttack.ts" },
    { name: "defense.ts",   path: "lib/defense.ts" },
    { name: "logs.ts",      path: "lib/logs.ts" },
  ]},
  { name: "app", children: [
    { name: "page.tsx",     path: "app/page.tsx",      badge: "VULN", badgeColor: "#ef4444" },
    { name: "api", children: [
      { name: "login/route.ts",        path: "app/api/login/route.ts",        badge: "VULN", badgeColor: "#ef4444" },
      { name: "register/route.ts",     path: "app/api/register/route.ts",     badge: "VULN", badgeColor: "#ef4444" },
      { name: "user/route.ts",         path: "app/api/user/route.ts",         badge: "VULN", badgeColor: "#ef4444" },
      { name: "profile/route.ts",      path: "app/api/profile/route.ts",      badge: "VULN", badgeColor: "#ef4444" },
      { name: "search/route.ts",       path: "app/api/search/route.ts",       badge: "VULN", badgeColor: "#ef4444" },
      { name: "transactions/route.ts", path: "app/api/transactions/route.ts", badge: "VULN", badgeColor: "#ef4444" },
      { name: "transfer/route.ts",     path: "app/api/transfer/route.ts",     badge: "VULN", badgeColor: "#ef4444" },
      { name: "redirect/route.ts",     path: "app/api/redirect/route.ts",     badge: "VULN", badgeColor: "#ef4444" },
      { name: "fetch-url/route.ts",    path: "app/api/fetch-url/route.ts",    badge: "VULN", badgeColor: "#ef4444" },
      { name: "secret/route.ts",       path: "app/api/secret/route.ts",       badge: "VULN", badgeColor: "#ef4444" },
      { name: "debug/route.ts",        path: "app/api/debug/route.ts",        badge: "VULN", badgeColor: "#ef4444" },
    ]},
    { name: "login/page.tsx",        path: "app/login/page.tsx",        badge: "VULN", badgeColor: "#ef4444" },
    { name: "dashboard/page.tsx",    path: "app/dashboard/page.tsx" },
    { name: "profile/page.tsx",      path: "app/profile/page.tsx",      badge: "VULN", badgeColor: "#ef4444" },
    { name: "search/page.tsx",       path: "app/search/page.tsx" },
    { name: "transactions/page.tsx", path: "app/transactions/page.tsx", badge: "VULN", badgeColor: "#ef4444" },
    { name: "transfer/page.tsx",     path: "app/transfer/page.tsx" },
    { name: "redirect/page.tsx",     path: "app/redirect/page.tsx",     badge: "VULN", badgeColor: "#ef4444" },
    { name: "link-account/page.tsx", path: "app/link-account/page.tsx", badge: "VULN", badgeColor: "#ef4444" },
    { name: "debug/page.tsx",        path: "app/debug/page.tsx",        badge: "VULN", badgeColor: "#ef4444" },
  ]},
  { name: "config", children: [
    { name: "next.config.js", path: "next.config.js", badge: "CONFIG", badgeColor: "#f59e0b" },
    { name: "middleware.ts",  path: "middleware.ts",   badge: "CONFIG", badgeColor: "#f59e0b" },
  ]},
];

const DB_SCHEMA = [
  {
    table: "users",
    vuln: true,
    note: "Passwords stored in PLAINTEXT. All rows exposed via SQLi on login and search.",
    cols: ["id PK", "username", "password ⚠", "email", "role ⚠", "balance ⚠", "account_number", "created_at"],
  },
  {
    table: "transactions",
    vuln: true,
    note: "user_id raw-interpolated in GET query → SQLi + IDOR. description rendered as innerHTML → Stored XSS.",
    cols: ["id PK", "user_id ⚠", "amount", "description ⚠", "type", "created_at"],
  },
  {
    table: "admin_notes",
    vuln: true,
    note: "Contains CTF flags. Extractable via UNION SELECT attacks on vulnerable endpoints.",
    cols: ["id PK", "note 🚩", "created_at"],
  },
  {
    table: "server_logs",
    vuln: true,
    note: "Contains flag in FLAG_HINT row. Accessible via SQLi or admin panel IDOR.",
    cols: ["id PK", "action", "user_id", "ip", "details ⚠", "created_at"],
  },
  {
    table: "logs",
    vuln: false,
    note: "",
    cols: ["id PK", "time", "ip", "event", "detail"],
  },
];

const QUICK = [
  ["app/api/login/route.ts",   "Login endpoint (SQLi)"],
  ["lib/auth.ts",              "JWT auth logic"],
  ["app/api/fetch-url/route.ts", "SSRF vector"],
  ["app/api/profile/route.ts", "Mass assignment"],
];

function flattenFiles(nodes: FileNode[]): { name: string; path: string; badge?: string; badgeColor?: string }[] {
  const out: any[] = [];
  for (const n of nodes) {
    if (n.path) out.push({ name: n.name, path: n.path, badge: n.badge, badgeColor: n.badgeColor });
    if (n.children) out.push(...flattenFiles(n.children));
  }
  return out;
}

function fileIcon(name: string) {
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "⟨/⟩";
  if (name.endsWith(".js")) return "⟨/⟩";
  return "📄";
}

function TreeNode({ node, depth, selected, onSelect }: { node: FileNode; depth: number; selected: string | null; onSelect: (p: string) => void }) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = !!node.children;
  const isSel = node.path === selected;

  return (
    <div>
      <div onClick={() => isDir ? setOpen(v => !v) : node.path && onSelect(node.path)} style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: `5px 10px 5px ${10 + depth * 16}px`,
        cursor: "pointer", borderRadius: 6, margin: "1px 6px",
        background: isSel ? "rgba(245,130,10,0.1)" : "transparent",
        borderLeft: isSel ? "2px solid #f5820a" : "2px solid transparent",
        userSelect: "none", transition: "background .1s",
      }}>
        {isDir
          ? <span style={{ fontSize: 10, color: "#374151", width: 14, textAlign: "center" }}>{open ? "▼" : "▶"}</span>
          : <span style={{ fontSize: 10, fontFamily: mono, color: node.badgeColor ?? "#374151", width: 14, textAlign: "center" }}>{fileIcon(node.name)}</span>
        }
        <span style={{ fontSize: 12, fontFamily: mono, flex: 1, color: isSel ? "#f5820a" : isDir ? "#94a3b8" : "#6b7280", fontWeight: isSel ? 700 : 400 }}>
          {node.name}
        </span>
        {node.badge && (
          <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: `${node.badgeColor}18`, color: node.badgeColor, border: `1px solid ${node.badgeColor}30` }}>
            {node.badge}
          </span>
        )}
      </div>
      {isDir && open && node.children?.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />)}
    </div>
  );
}

function CodeViewer({ filePath }: { filePath: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const prev = useRef("");

  useEffect(() => {
    if (!filePath || filePath === prev.current) return;
    prev.current = filePath;
    setLoading(true); setError(""); setContent(null);
    fetch(`/api/defense/source?file=${encodeURIComponent(filePath)}`)
      .then(r => r.json())
      .then(d => d.content !== undefined ? setContent(d.content) : setError(d.error ?? "Error"))
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [filePath]);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#0d1117" }}>
      <div style={{ width: 26, height: 26, border: "2px solid rgba(245,130,10,0.2)", borderTopColor: "#f5820a", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <div style={{ fontSize: 11, color: "#374151", fontFamily: mono }}>Loading {filePath}…</div>
    </div>
  );
  if (error) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, background: "#0d1117" }}>
      <div style={{ fontSize: 24 }}>⚠️</div>
      <div style={{ fontSize: 12, color: "#f87171", fontFamily: mono }}>{error}</div>
    </div>
  );
  if (!content) return null;

  const lines = content.split("\n");
  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#0d1117" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 13, lineHeight: 1.75 }}>
        <tbody>
          {lines.map((line, i) => {
            const isVuln = line.includes("// VULN") || line.includes("// VULNERABILITY") || line.includes("// VULNERABLE");
            const isFix  = line.includes("// FIX")  || line.includes("// SECURE");
            return (
              <tr key={i} style={{ background: isVuln ? "rgba(239,68,68,0.1)" : isFix ? "rgba(34,197,94,0.06)" : "transparent" }}>
                <td style={{ width: 52, minWidth: 52, textAlign: "right", paddingRight: 18, paddingLeft: 12, color: isVuln ? "#f87171" : "#2d3748", fontSize: 11, borderRight: `2px solid ${isVuln ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.04)"}`, userSelect: "none", fontWeight: isVuln ? 700 : 400 }}>
                  {i + 1}
                </td>
                <td style={{ paddingLeft: 18, paddingRight: 16, whiteSpace: "pre-wrap", wordBreak: "break-all", color: isVuln ? "#fca5a5" : isFix ? "#86efac" : "#c9d1d9" }}>
                  {isVuln && <span style={{ fontSize: 8, fontWeight: 800, marginRight: 8, background: "rgba(239,68,68,0.2)", color: "#f87171", padding: "1px 5px", borderRadius: 3, verticalAlign: "middle" }}>VULN</span>}
                  {line || " "}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DbSchemaViewer() {
  const [expanded, setExpanded] = useState<string>("users");
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "#010409" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 3, height: 22, borderRadius: 2, background: "#8b5cf6" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0" }}>🗄️ neobank</span>
          <span style={{ fontSize: 10, fontFamily: mono, color: "#374151", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", padding: "2px 8px", borderRadius: 5 }}>MySQL 8 · mysql2</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#4b5563", lineHeight: 1.65, paddingLeft: 13 }}>
          All tables are shown below. <span style={{ color: "#f87171", fontWeight: 600 }}>Red bordered</span> tables contain security vulnerabilities or sensitive data.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DB_SCHEMA.map(t => {
          const isOpen = expanded === t.table;
          return (
            <div key={t.table} style={{ border: `1px solid ${t.vuln ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, overflow: "hidden", background: "#0d1117", transition: "all .15s" }}>
              <button onClick={() => setExpanded(isOpen ? "" : t.table)} style={{ width: "100%", textAlign: "left", padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: mono }}>
                <span style={{ fontSize: 11, color: "#374151", transition: "transform .15s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#c9d1d9" }}>{t.table}</span>
                <span style={{ fontSize: 10, color: "#374151" }}>({t.cols.length} columns)</span>
                {t.vuln && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>SECURITY ISSUE</span>}
              </button>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${t.vuln ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)"}` }}>
                  {t.note && <div style={{ padding: "10px 16px", background: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.1)", fontSize: 12, color: "#fca5a5", lineHeight: 1.55 }}>⚠️ {t.note}</div>}
                  <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {t.cols.map(col => {
                      const isVuln = col.includes("⚠") || col.includes("🚩");
                      const isPK   = col.includes("PK");
                      return (
                        <div key={col} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: isPK ? "rgba(245,130,10,0.1)" : isVuln ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${isPK ? "rgba(245,130,10,0.2)" : isVuln ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                          <span style={{ fontSize: 11, fontFamily: mono, color: isPK ? "#f5820a" : isVuln ? "#fca5a5" : "#6b7280" }}>{col}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Panel = "code" | "db";

export function CodebaseTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel]       = useState<Panel>("code");
  const [search, setSearch]     = useState("");
  const allFiles = flattenFiles(FILE_TREE);
  const results  = search.trim().length > 1 ? allFiles.filter(f => f.path.toLowerCase().includes(search.toLowerCase())) : [];

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0, background: "#010409" }}>

      {/* Sidebar */}
      <div style={{ width: 270, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "#0d1117" }}>
        {/* Header */}
        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#374151", letterSpacing: ".18em", marginBottom: 10 }}>EXPLORER — READ ONLY</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#374151" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, padding: "7px 10px 7px 30px", color: "#94a3b8", fontFamily: mono, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Panel toggle */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {([["code","📁 Files","#f5820a"], ["db","🗄️ Database","#8b5cf6"]] as [Panel, string, string][]).map(([id, label, accent]) => (
            <button key={id} onClick={() => setPanel(id)} style={{ flex: 1, padding: "9px 0", fontFamily: sans, fontSize: 11, fontWeight: 700, background: panel === id ? `${accent}10` : "transparent", border: "none", borderBottom: panel === id ? `2px solid ${accent}` : "2px solid transparent", color: panel === id ? accent : "#374151", cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tree or search results */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 6 }}>
          {results.length > 0 ? (
            <div>
              <div style={{ padding: "4px 14px 6px", fontSize: 9, color: "#374151", fontWeight: 800, letterSpacing: ".12em" }}>RESULTS ({results.length})</div>
              {results.map(f => (
                <div key={f.path} onClick={() => { setSelected(f.path); setPanel("code"); }} style={{ padding: "7px 14px", cursor: "pointer", fontFamily: mono, fontSize: 11, color: selected === f.path ? "#f5820a" : "#6b7280", background: selected === f.path ? "rgba(245,130,10,0.08)" : "transparent", borderLeft: `2px solid ${selected === f.path ? "#f5820a" : "transparent"}` }}>
                  {f.path}
                  {f.badge && <span style={{ marginLeft: 8, fontSize: 8, fontWeight: 800, color: f.badgeColor, background: `${f.badgeColor}18`, padding: "1px 5px", borderRadius: 3, border: `1px solid ${f.badgeColor}30` }}>{f.badge}</span>}
                </div>
              ))}
            </div>
          ) : panel === "code" ? (
            FILE_TREE.map((n, i) => <TreeNode key={i} node={n} depth={0} selected={selected} onSelect={p => { setSelected(p); setPanel("code"); }} />)
          ) : (
            <div style={{ padding: "8px 12px" }}>
              {DB_SCHEMA.map(t => (
                <div key={t.table} style={{ padding: "7px 10px", fontFamily: mono, fontSize: 11, color: t.vuln ? "#f87171" : "#6b7280", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, margin: "2px 0" }}>
                  🗄️ {t.table}
                  {t.vuln && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(239,68,68,0.12)", color: "#f87171" }}>VULN</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: "#1f2937", fontWeight: 800, letterSpacing: ".12em", marginBottom: 7 }}>LEGEND</div>
          {[["VULN","#ef4444","Vulnerability present"],["CONFIG","#f59e0b","App config"],["SCHEMA","#8b5cf6","DB schema"]].map(([b, c, d]) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: `${c}18`, color: c, border: `1px solid ${c}30` }}>{b}</span>
              <span style={{ fontSize: 10, color: "#374151" }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Tab bar */}
        <div style={{ height: 40, background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 14px", gap: 6, flexShrink: 0 }}>
          {selected && panel === "code" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, borderTop: "2px solid #f5820a", fontSize: 11, fontFamily: mono, color: "#94a3b8" }}>
              <span style={{ color: "#f5820a" }}>⟨/⟩</span> {selected}
              <span style={{ fontSize: 9, color: "#1f2937", marginLeft: 4, background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 3 }}>READ ONLY</span>
            </div>
          )}
          {panel === "db" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, borderTop: "2px solid #8b5cf6", fontSize: 11, fontFamily: mono, color: "#94a3b8" }}>
              🗄️ neobank (MySQL)
              <span style={{ fontSize: 9, color: "#1f2937", marginLeft: 4, background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 3 }}>READ ONLY</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {panel === "db" ? <DbSchemaViewer /> : selected ? <CodeViewer filePath={selected} /> : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, background: "#0d1117", padding: 32 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 52, opacity: 0.06, marginBottom: 16 }}>📁</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#374151", letterSpacing: ".04em", marginBottom: 8 }}>CODEBASE EXPLORER</div>
                <div style={{ fontSize: 12, color: "#1f2937", lineHeight: 1.7, maxWidth: 360 }}>
                  Select a file from the tree to view its complete source. All files are <span style={{ color: "#f5820a" }}>read-only</span> — use the Patch IDE to fix vulnerabilities.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 440, width: "100%" }}>
                {QUICK.map(([p, desc]) => (
                  <button key={p} onClick={() => setSelected(p)} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", fontFamily: sans, transition: "all .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,130,10,0.3)"; (e.currentTarget as HTMLElement).style.background = "rgba(245,130,10,0.05)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}>
                    <div style={{ fontSize: 11, fontFamily: mono, color: "#f5820a", marginBottom: 4 }}>{p}</div>
                    <div style={{ fontSize: 10, color: "#374151" }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
