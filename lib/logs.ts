import { getDb } from "./db";

export async function addLog(log: {
  time: string;
  ip: string;
  event: string;
  detail?: any;
}) {
  const db = await getDb();

  await db.query(
    `INSERT INTO server_logs (time, ip, event, detail)
     VALUES (?, ?, ?, ?)`,
    [log.time, log.ip, log.event, JSON.stringify(log.detail || {})],
  );
}
