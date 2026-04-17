'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

function b64urlDecode(str: string) {
  try { return atob(str.replace(/-/g, '+').replace(/_/g, '/')); } catch { return null; }
}

export default function TokenPage() {
  const [token, setToken] = useState('');
  const [decoded, setDecoded] = useState<any>(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    if (t) decode(t);
  }, []);

  const decode = (t: string) => {
    try {
      const [h, p] = t.split('.');
      setDecoded({ header: JSON.parse(b64urlDecode(h) || '{}'), payload: JSON.parse(b64urlDecode(p) || '{}') });
    } catch { setDecoded(null); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f7f4', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.6px', marginBottom: 4 }}>Access token</h1>
          <p style={{ fontSize: 14, color: '#8a7f6e' }}>Your current session token and its contents.</p>
        </div>

        <div style={{ maxWidth: 700 }}>
          <div style={{ background: 'white', border: '1px solid #e8e4dc', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#8a7f6e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Raw token</div>
            <textarea value={token} onChange={e => { setToken(e.target.value); decode(e.target.value); }} rows={3}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #e8e4dc', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', background: '#f8f7f4', outline: 'none', resize: 'none', color: '#1a1a1a', boxSizing: 'border-box' }} />
          </div>

          {decoded && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[['Header', decoded.header], ['Payload', decoded.payload]].map(([label, obj]) => (
                <div key={label as string} style={{ background: 'white', border: '1px solid #e8e4dc', borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8a7f6e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>{label as string}</div>
                  {Object.entries(obj as any).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f0ede6', fontSize: 13 }}>
                      <span style={{ color: '#8a7f6e' }}>{k}</span>
                      <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
