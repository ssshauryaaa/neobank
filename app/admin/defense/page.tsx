"use client";

import { useEffect, useState } from "react";

type Log = {
  id: number;
  event?: string;
  ip?: string;
  time?: string;
  detail?: string;
};

export default function DefensePage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("/api/admin/logs", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLogs(data.logs);
      });
  }, []);

  // ✅ 👇 THIS is where classify goes
  const classify = (log: Log) => {
    const event = (log.event || "").toLowerCase();

    if (event.includes("sql")) {
      return { label: "SQL Injection", color: "#f59e0b" };
    }

    if (event.includes("role")) {
      if (log.detail?.includes('"to":"admin"')) {
        return { label: "⚠️ JWT Admin Escalation", color: "#ef4444" };
      }
      return { label: "JWT Tampering", color: "#3b82f6" };
    }

    if (event.includes("invalid")) {
      return { label: "Blocked Attack", color: "#ef4444" };
    }

    if (event.includes("idor")) {
      return { label: "IDOR Attack", color: "#a855f7" };
    }

    return { label: "Other", color: "#6b7280" };
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>🛡️ Defense Dashboard</h1>

      {logs.map((log) => {
        const tag = classify(log);

        return (
          <div
            key={log.id}
            style={{
              borderLeft: `6px solid ${tag.color}`,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div>
              <b>{tag.label}</b> → {log.event || "UNKNOWN"}
            </div>
            <div style={{ fontSize: 12 }}>
              {log.time} | {log.ip}
            </div>
          </div>
        );
      })}
    </div>
  );
}
