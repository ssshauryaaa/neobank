'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) router.push('/login');
      else setError(data.message || 'Could not create account. Try a different username.');
    } catch {
      setLoading(false);
      setError('Something went wrong. Please try again.');
    }
  };

  const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #d4d0c8', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' } as any;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48, textDecoration: 'none', color: '#1a1a1a' }}>
          <div style={{ width: 28, height: 28, background: '#1a1a1a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.4px' }}>neobank</span>
        </Link>

        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.8px', marginBottom: 6 }}>Create your account</h1>
        <p style={{ fontSize: 14, color: '#8a7f6e', marginBottom: 36 }}>Free to open. No monthly fees.</p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#dc2626', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#6b6355', marginBottom: 6 }}>Username</label>
            <input style={inputStyle} type="text" placeholder="Choose a username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#6b6355', marginBottom: 6 }}>Email address</label>
            <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#6b6355', marginBottom: 6 }}>Password</label>
            <input style={inputStyle} type="password" placeholder="At least 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 8, background: '#1a1a1a', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '-0.2px' }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#8a7f6e' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1a1a1a', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#b8b2a7' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
