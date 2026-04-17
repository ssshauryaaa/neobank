import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "shaurya",
  database: process.env.DB_NAME || "neobank",
  waitForConnections: true,
  connectionLimit: 10, // 🔥 max connections
  queueLimit: 0,
  multipleStatements: true, // keep for SQLi CTF
};

let pool: mysql.Pool;

export function getDb() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}
