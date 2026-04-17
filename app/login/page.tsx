'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // New state for visibility
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        document.cookie = `session=${data.user.id}; path=/`;
        router.push('/dashboard');
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch {
      setLoading(false);
      setError('Something went wrong. Please try again.');
    }
  };

  const s = {
    page: { minHeight: '100vh', background: '#f8f7f4', display: 'flex', fontFamily: 'Inter, sans-serif' } as any,
    left: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' } as any,
    right: { width: 480, background: '#1a1a1a', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 56px' } as any,
    form: { width: '100%', maxWidth: 400 } as any,
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#6b6355', marginBottom: 6 } as any,
    input: { width: '100%', padding: '12px 14px', border: '1px solid #d4d0c8', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' } as any,
    btn: { width: '100%', padding: '13px', borderRadius: 8, background: '#1a1a1a', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', letterSpacing: '-0.2px' } as any,
    // Style for the container and the toggle button
    inputWrapper: { position: 'relative', width: '100%' } as any,
    toggleBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8a7f6e', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' } as any,
  };

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.form}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48, textDecoration: 'none', color: '#1a1a1a' }}>
            <div style={{ width: 28, height: 28, background: '#1a1a1a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.4px' }}>neobank</span>
          </Link>

          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.8px', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: '#8a7f6e', marginBottom: 36 }}>Sign in to your account to continue.</p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#dc2626', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label style={s.label}>Username</label>
              <input style={s.input} type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={s.label}>Password</label>
                <a href="#" style={{ fontSize: 13, color: '#8a7f6e', textDecoration: 'none' }}>Forgot password?</a>
              </div>
              
              {/* Wrapped input to position the toggle button */}
              <div style={s.inputWrapper}>
                <input 
                  style={{ ...s.input, paddingRight: 60 }} // Extra padding so text doesn't overlap button
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter your password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  style={s.toggleBtn} 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#8a7f6e' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: '#1a1a1a', fontWeight: 600, textDecoration: 'none' }}>Open one free</Link>
          </p>
        </div>
      </div>

      {/* Right — brand panel */}
      <div style={s.right}>
        <div style={{ marginBottom: 'auto', paddingBottom: 64 }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 36, color: 'white', lineHeight: 1.2, letterSpacing: '-1px', marginBottom: 24 }}>
            Your money,<br /><em>your control.</em>
          </div>
          <p style={{ color: '#8a7f6e', fontSize: 15, lineHeight: 1.7, maxWidth: 320 }}>
            Track balances, send transfers, and manage your finances from anywhere — all in one place.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { n: '2M+', label: 'Active customers' },
            { n: '$14B', label: 'Processed annually' },
            { n: '99.98%', label: 'Platform uptime' },
          ].map(stat => (
            <div key={stat.n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2e2e2e', paddingTop: 16 }}>
              <span style={{ color: '#8a7f6e', fontSize: 13 }}>{stat.label}</span>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>{stat.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}