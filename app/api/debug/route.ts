import { NextRequest, NextResponse } from 'next/server';

// ⚙️ VULNERABLE: Debug endpoint left in production, exposes sensitive server info
export async function GET(req: NextRequest) {
  return NextResponse.json({
    server: 'NeoBank API v1.0',
    node_version: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    // 🔴 VULNERABLE: Exposes env variables (filtered but still leaks structure)
    env: {
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_USER: process.env.DB_USER || 'root',
      DB_NAME: process.env.DB_NAME || 'neobank',
      JWT_SECRET: process.env.JWT_SECRET || 'secret',   // leaks JWT secret!
      NODE_ENV: process.env.NODE_ENV,
    },
    endpoints: [
      '/api/login',
      '/api/register',
      '/api/user',
      '/api/transactions',
      '/api/transfer',
      '/api/search',
      '/api/admin/users',
      '/api/admin/logs',
      '/api/debug',
      '/api/secret',       // hint about hidden endpoint
    ],
    flags_hint: 'Check /public/backup.sql and /public/.env',
  });
}
