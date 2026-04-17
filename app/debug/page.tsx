'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

export default function DebugPage() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/debug').then(r => r.json()).then(setInfo);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f7f4', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.6px', marginBottom: 4 }}>System info</h1>
          <p style={{ fontSize: 14, color: '#8a7f6e' }}>Internal diagnostics and server status.</p>
        </div>
        {info && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 800 }}>
            <div style={{ background: 'white', border: '1px solid #e8e4dc', borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#8a7f6e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Server</h3>
              {[['Version', info.server], ['Node', info.node_version], ['Platform', info.platform], ['Uptime', `${Math.round(info.uptime)}s`]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ede6', fontSize: 14 }}>
                  <span style={{ color: '#8a7f6e' }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{String(v)}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', border: '1px solid #e8e4dc', borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#8a7f6e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Environment</h3>
              {Object.entries(info.env || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0ede6', fontSize: 14 }}>
                  <span style={{ color: '#8a7f6e' }}>{k}</span>
                  <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 13 }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
