'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Logo } from '@/src/components/layout/logo';
import { useAuth } from '@/src/hooks/use-auth';

type Step = 'landing' | 'pat_input';

export default function LoginPage() {
  const router = useRouter();
  const { connect, isConnected, loading } = useAuth();
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('landing');

  useEffect(() => {
    if (!loading && isConnected) {
      router.replace('/');
    }
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
      setError(result.error ?? 'Could not connect. Check your Personal Access Token.');
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1C1C1C', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #363636', borderTopColor: '#fff', animation: 'spin 0.75s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1C1C1C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-display, system-ui)', WebkitFontSmoothing: 'antialiased' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '400px', background: '#202020', border: '1px solid #2E2E2E', borderRadius: '16px', padding: '36px', boxShadow: '0 0 1px rgba(0,0,0,.48),0 0 2px rgba(0,0,0,.64),0 16px 48px rgba(0,0,0,.4)' }}>

        {/* Logo + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', gap: '12px' }}>
          <Logo size={32} />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: 'var(--font-display, system-ui)' }}>
              Stackby Studio
            </h1>
            <p style={{ fontSize: '14px', color: '#8A8A8A', margin: 0, lineHeight: 1.5 }}>
              Build custom apps from your Stackby data
            </p>
          </div>
        </div>

        {step === 'landing' ? (
          <>
            {/* Primary CTA */}
            <button
              onClick={() => setStep('pat_input')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', height: '44px', borderRadius: '10px', background: '#fff', color: '#111', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', marginBottom: '20px', transition: 'opacity 150ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <Logo size={18} />
              Sign in with Stackby
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: '#2E2E2E' }} />
              <span style={{ fontSize: '13px', color: '#6B6B6B' }}>or connect with a PAT</span>
              <div style={{ flex: 1, height: '1px', background: '#2E2E2E' }} />
            </div>

            <button
              onClick={() => setStep('pat_input')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '40px', borderRadius: '8px', background: 'transparent', border: '1px solid #363636', color: '#EDEDED', fontSize: '15px', cursor: 'pointer', transition: 'border-color 150ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4A4A4A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#363636'; }}
            >
              Use Personal Access Token
            </button>

            <p style={{ marginTop: '20px', fontSize: '13px', color: '#6B6B6B', textAlign: 'center' }}>
              Don&apos;t have a Stackby account?{' '}
              <a href="https://stackby.com/signup" target="_blank" rel="noopener noreferrer" style={{ color: '#2D7FF9', textDecoration: 'none' }}>
                Sign up free
              </a>
            </p>
          </>
        ) : (
          <form onSubmit={(e) => void handleConnect(e)}>
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#8A8A8A', marginBottom: '6px' }}>
                Personal Access Token
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  autoFocus
                  type={showPat ? 'text' : 'password'}
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="pat_xxxxxxxxxxxxxxxxxx"
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #363636', background: '#282828', color: '#fff', fontSize: '14px', padding: '0 40px 0 12px', outline: 'none', fontFamily: "'IBM Plex Mono', monospace", boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPat((s) => !s)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  {showPat
                    ? <EyeOff size={15} strokeWidth={1.6} />
                    : <Eye size={15} strokeWidth={1.6} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#F87171', margin: '8px 0 0' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={!pat.trim() || connecting}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '44px', borderRadius: '10px', background: pat.trim() ? '#fff' : '#282828', color: pat.trim() ? '#111' : '#6B6B6B', fontSize: '15px', fontWeight: 600, border: 'none', cursor: pat.trim() && !connecting ? 'pointer' : 'default', marginTop: '14px', transition: 'background 150ms ease' }}
            >
              {connecting ? (
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #363636', borderTopColor: '#111', animation: 'spin 0.75s linear infinite' }} />
              ) : 'Connect to Stackby'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('landing'); setError(''); setPat(''); }}
              style={{ display: 'block', width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#6B6B6B', fontSize: '13px', cursor: 'pointer', padding: '6px 0', textAlign: 'center' }}
            >
              ← Back
            </button>

            <div style={{ marginTop: '16px', padding: '12px', background: '#282828', borderRadius: '8px', border: '1px solid #363636' }}>
              <p style={{ fontSize: '12px', color: '#8A8A8A', margin: '0 0 6px', fontWeight: 600 }}>Where to find your PAT</p>
              <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0, lineHeight: 1.6 }}>
                Go to <strong style={{ color: '#EDEDED' }}>stackby.com</strong> → Account Settings → API Keys → Create a Personal Access Token with <em>data.records:read</em> and <em>schema.bases:read</em> scopes.
              </p>
              <a
                href="https://stackby.com/account/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2D7FF9', marginTop: '8px', textDecoration: 'none' }}
              >
                Open API Keys <ExternalLink size={11} strokeWidth={1.6} />
              </a>
            </div>
          </form>
        )}
      </div>

      <p style={{ marginTop: '24px', fontSize: '12px', color: '#6B6B6B', textAlign: 'center' }}>
        By signing in, you agree to the{' '}
        <a href="https://stackby.com/terms" target="_blank" rel="noopener" style={{ color: '#8A8A8A', textDecoration: 'none' }}>Terms</a>
        {' '}and{' '}
        <a href="https://stackby.com/privacy" target="_blank" rel="noopener" style={{ color: '#8A8A8A', textDecoration: 'none' }}>Privacy Policy</a>
      </p>
    </div>
  );
}
