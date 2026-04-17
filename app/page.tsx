import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f8f7f4', minHeight: '100vh', color: '#1a1a1a' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #e8e4dc', background: '#f8f7f4', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.5px' }}>neobank</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d4d0c8', fontSize: 14, fontWeight: 500, color: '#1a1a1a', textDecoration: 'none', background: 'white' }}>Sign in</Link>
            <Link href="/register" style={{ padding: '8px 20px', borderRadius: 8, background: '#1a1a1a', color: 'white', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Open account</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px 80px' }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f0ede6', borderRadius: 20, fontSize: 12, fontWeight: 500, color: '#6b6355', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Now available across 50+ countries
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(44px, 7vw, 72px)', lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 24, color: '#1a1a1a' }}>
            Banking that<br />
            <em style={{ fontStyle: 'italic', color: '#8a7f6e' }}>actually</em> works.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: '#6b6355', marginBottom: 40, maxWidth: 480 }}>
            Send money instantly, track your spending, and manage everything from one clean dashboard. No hidden fees, no nonsense. 
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/register" style={{ padding: '14px 28px', borderRadius: 10, background: '#1a1a1a', color: 'white', fontSize: 15, fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.3px' }}>
              Get started free
            </Link>
            <Link href="/login" style={{ padding: '14px 24px', borderRadius: 10, border: '1px solid #d4d0c8', color: '#1a1a1a', fontSize: 15, fontWeight: 500, textDecoration: 'none', background: 'white' }}>
              Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            { icon: '⚡', title: 'Instant transfers', desc: 'Send money to anyone in seconds. No waiting, no delays.' },
            { icon: '📊', title: 'Spending analytics', desc: 'See exactly where your money goes with smart categorization.' },
            { icon: '🔐', title: 'Secure by default', desc: 'Your money is protected by bank-grade security protocols.' },
            { icon: '💳', title: 'Virtual cards', desc: 'Create virtual cards for online shopping, freeze them anytime.' },
          ].map(f => (
            <div key={f.title} style={{ background: 'white', border: '1px solid #e8e4dc', borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, letterSpacing: '-0.3px' }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#8a7f6e', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section style={{ borderTop: '1px solid #e8e4dc', borderBottom: '1px solid #e8e4dc', background: 'white', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#8a7f6e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 40 }}>Trusted by over 2 million customers</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
            {['2M+ users', '$14B moved', '99.98% uptime', '4.9★ rating'].map(s => (
              <div key={s} style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#1a1a1a' }}>{s}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-1.5px', marginBottom: 20 }}>Ready to get started?</h2>
        <p style={{ fontSize: 16, color: '#8a7f6e', marginBottom: 36 }}>Open your account in under 2 minutes. No paperwork required.</p>
        <Link href="/register" style={{ padding: '16px 36px', borderRadius: 10, background: '#1a1a1a', color: 'white', fontSize: 15, fontWeight: 600, textDecoration: 'none', letterSpacing: '-0.3px', display: 'inline-block' }}>
          Create your account
        </Link>
      </section>

      <footer style={{ borderTop: '1px solid #e8e4dc', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontWeight: 700, letterSpacing: '-0.5px', fontSize: 15 }}>neobank</span>
          <span style={{ fontSize: 13, color: '#8a7f6e' }}>© 2026 Neobank Inc. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
