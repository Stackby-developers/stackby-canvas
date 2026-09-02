'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/src/components/layout/logo';
import { useAuth } from '@/src/hooks/use-auth';

const FEATURES = [
  'Describe what you need — get a live React app in under 4 minutes',
  'Connected to your real Stackby data — zero fabricated values, ever',
  'Export source to GitHub, publish to a custom URL, or embed anywhere',
];

export default function LoginPage() {
  const router = useRouter();
  const { connect, isConnected, loading } = useAuth();
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const patRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && isConnected) router.replace('/');
  }, [loading, isConnected, router]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!pat.trim() || connecting) return;
    setConnecting(true);
    setError('');
    const result = await connect(pat.trim());
    setConnecting(false);
    if (result.ok) {
      router.replace('/');
    } else {
      setError(result.error ?? 'Could not connect. Check your token and try again.');
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1C1C1C', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #363636', borderTopColor: '#fff', animation: 'spin 0.75s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1C1C1C', display: 'flex', fontFamily: 'var(--font-display, -apple-system, system-ui, sans-serif)', WebkitFontSmoothing: 'antialiased' }}>

      {/* ─── LEFT: Product showcase ─── */}
      <div className="login-left" style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', padding: '52px 56px', borderRight: '1px solid #2E2E2E' }}>

        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '64px' }}>
          <Logo size={22} />
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Stackby Studio</span>
        </div>

        {/* Hero */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '480px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2D7FF9', marginBottom: '16px' }}>
            Powered by Stackby
          </p>
          <h1 style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.025em', color: '#fff', margin: '0 0 20px' }}>
            Build apps<br />from your data.
          </h1>
          <p style={{ fontSize: '17px', color: '#8A8A8A', lineHeight: 1.6, margin: '0 0 36px', maxWidth: '420px' }}>
            Describe what you want to build in plain English. Studio generates a real React app connected to your Stackby bases — ready to publish or export in minutes.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '48px' }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 size={17} strokeWidth={1.6} style={{ color: '#2D7FF9', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '15px', color: '#EDEDED', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Mini composer mockup */}
          <div style={{ background: '#202020', border: '1px solid #2E2E2E', borderRadius: '14px', padding: '14px 16px', maxWidth: '400px' }}>
            <p style={{ fontSize: '13px', color: '#6B6B6B', margin: '0 0 10px', fontStyle: 'italic' }}>
              &ldquo;Build a CRM dashboard showing deal pipeline with KPIs…&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#282828', border: '1px solid #363636', display: 'grid', placeItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#8A8A8A' }}>+</span>
              </div>
              <div style={{ height: '28px', borderRadius: '999px', background: '#282828', border: '1px solid #363636', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#EDEDED' }}>Report</span>
                <span style={{ fontSize: '10px', color: '#6B6B6B' }}>▾</span>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#111', fontWeight: 700 }}>↑</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#4A4A4A', marginTop: '32px', lineHeight: 1.5 }}>
            Already using Airtable Canvas? Stackby Studio works the same way.
          </p>
        </div>

        {/* Footer */}
        <p style={{ fontSize: '13px', color: '#4A4A4A', marginTop: '32px' }}>
          © 2026 Stackby ·{' '}
          <a href="https://stackby.com/privacy" style={{ color: '#4A4A4A', textDecoration: 'none' }}>Privacy</a>
          {' '}·{' '}
          <a href="https://stackby.com/terms" style={{ color: '#4A4A4A', textDecoration: 'none' }}>Terms</a>
        </p>
      </div>

      {/* ─── RIGHT: Auth panel ─── */}
      <div className="login-right" style={{ flex: 1, background: '#202020', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>

        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Sign in to Studio
            </h2>
            <p style={{ fontSize: '14px', color: '#8A8A8A', margin: 0, lineHeight: 1.5 }}>
              Your Stackby bases load automatically after connecting.
            </p>
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => patRef.current?.focus()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', height: '46px', borderRadius: '10px', background: '#fff', color: '#111', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', marginBottom: '24px', letterSpacing: '-0.01em' }}
          >
            <Logo size={18} />
            Sign in with Stackby
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: '#2E2E2E' }} />
            <span style={{ fontSize: '12px', color: '#4A4A4A' }}>or use a Personal Access Token</span>
            <div style={{ flex: 1, height: '1px', background: '#2E2E2E' }} />
          </div>

          {/* PAT form */}
          <form onSubmit={(e) => void handleConnect(e)}>
            <label style={{ display: 'block', fontSize: '13px', color: '#8A8A8A', marginBottom: '6px', fontWeight: 500 }}>
              Personal Access Token
            </label>
            <div style={{ position: 'relative', marginBottom: error ? '6px' : '0' }}>
              <input
                ref={patRef}
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={(e) => { setPat(e.target.value); setError(''); }}
                placeholder="pat_xxxxxxxxxxxxxxxxxx"
                style={{ width: '100%', height: '42px', borderRadius: '8px', border: `1px solid ${error ? '#F87171' : '#363636'}`, background: '#282828', color: '#fff', fontSize: '14px', padding: '0 40px 0 12px', outline: 'none', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", boxSizing: 'border-box', transition: 'border-color 150ms' }}
              />
              <button
                type="button"
                onClick={() => setShowPat((s) => !s)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                {showPat ? <EyeOff size={15} strokeWidth={1.6} /> : <Eye size={15} strokeWidth={1.6} />}
              </button>
            </div>

            {error && <p style={{ fontSize: '13px', color: '#F87171', margin: '6px 0 0' }}>{error}</p>}

            <button
              type="submit"
              disabled={!pat.trim() || connecting}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '8px', background: pat.trim() ? '#2D7FF9' : '#282828', color: '#fff', fontSize: '15px', fontWeight: 600, border: 'none', cursor: pat.trim() ? 'pointer' : 'default', transition: 'background 150ms ease', opacity: connecting ? 0.7 : 1, marginTop: '12px' }}
            >
              {connecting ? (
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.75s linear infinite' }} />
              ) : 'Connect →'}
            </button>

            {/* How to get a PAT */}
            <div style={{ marginTop: '16px', padding: '12px', background: '#282828', borderRadius: '8px', border: '1px solid #363636' }}>
              <p style={{ fontSize: '12px', color: '#8A8A8A', margin: '0 0 4px', fontWeight: 600 }}>How to get a Personal Access Token</p>
              <p style={{ fontSize: '12px', color: '#6B6B6B', margin: '0 0 8px', lineHeight: 1.6 }}>
                Go to stackby.com → Account → API Keys → Create token with{' '}
                <strong style={{ color: '#EDEDED' }}>data.records:read</strong> and{' '}
                <strong style={{ color: '#EDEDED' }}>schema.bases:read</strong> scopes.
              </p>
              <a
                href="https://stackby.com/account/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2D7FF9', textDecoration: 'none' }}
              >
                Open API Keys <ExternalLink size={11} strokeWidth={1.6} />
              </a>
            </div>
          </form>

          {/* Divider */}
          <div style={{ height: '1px', background: '#2E2E2E', margin: '24px 0' }} />

          {/* Sign up */}
          <p style={{ fontSize: '14px', color: '#6B6B6B', textAlign: 'center', margin: 0 }}>
            Don&apos;t have a Stackby account?{' '}
            <a
              href="https://stackby.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2D7FF9', textDecoration: 'none', fontWeight: 500 }}
            >
              Create free account ↗
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #4A4A4A; }
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { flex: 1 !important; }
        }
      `}</style>
    </div>
  );
}
