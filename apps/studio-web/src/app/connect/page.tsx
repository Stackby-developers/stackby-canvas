'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ExternalLink, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/src/hooks/use-auth';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#686868" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3 3 7l9 4 9-4-9-4Z"/><path d="m3 12 9 4 9-4"/></svg>`;

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  card: { width: '400px', maxWidth: '100%', background: '#fff', border: '1px solid #eaeaea', borderRadius: '8px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.04)' },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: '16px' },
  brand: { textAlign: 'center', fontSize: '18px', fontWeight: 600, color: '#202020', letterSpacing: '-.01em', margin: '0 0 8px' } as React.CSSProperties,
  sub: { textAlign: 'center', fontSize: '14px', color: '#686868', margin: '0 0 28px', lineHeight: 1.5 } as React.CSSProperties,
  btnPrimary: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '38px', borderRadius: '6px', background: '#202020', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', letterSpacing: '-.01em', transition: 'background 120ms' },
  dividerRow: { display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0' },
  dividerLine: { flex: 1, height: '1px', background: '#eaeaea' },
  dividerText: { fontSize: '12px', color: '#9b9b9b' },
  linkBtn: { display: 'block', textAlign: 'center', width: '100%', background: 'none', border: 'none', fontSize: '14px', color: '#202020', cursor: 'pointer', padding: '8px 0', textDecoration: 'underline', textUnderlineOffset: '2px' } as React.CSSProperties,
  footer: { marginTop: '20px', fontSize: '12px', color: '#9b9b9b', textAlign: 'center', lineHeight: 1.6 } as React.CSSProperties,
  footerLink: { color: '#9b9b9b', textDecoration: 'underline', textUnderlineOffset: '2px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#202020', marginBottom: '6px' },
  inputWrap: { position: 'relative', marginBottom: '6px' },
  input: { width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #eaeaea', background: '#fff', color: '#202020', fontSize: '14px', padding: '0 36px 0 12px', outline: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', boxSizing: 'border-box', transition: 'border-color 120ms' },
  eyeBtn: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9b9b9b', cursor: 'pointer', padding: 0, display: 'flex' },
  error: { fontSize: '13px', color: '#d32f2f', margin: '6px 0 10px' },
  helpBox: { marginTop: '14px', padding: '12px', background: '#fafafa', borderRadius: '6px', border: '1px solid #eaeaea' },
  helpTitle: { fontSize: '12px', fontWeight: 600, color: '#202020', margin: '0 0 4px' },
  helpText: { fontSize: '12px', color: '#686868', margin: 0, lineHeight: 1.6 },
  helpLink: { display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: '#2D73F5', marginTop: '6px', textDecoration: 'none' },
  backBtn: { background: 'none', border: 'none', fontSize: '13px', color: '#686868', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '0 0 20px', marginLeft: '-2px' },
  secondaryLink: { display: 'block', textAlign: 'center', fontSize: '13px', color: '#686868', marginTop: '14px' } as React.CSSProperties,
  secondaryA: { color: '#2D73F5', textDecoration: 'none' },
};

export default function ConnectPage() {
  const router = useRouter();
  const { connect, isConnected, loading } = useAuth();
  const [step, setStep] = useState<'landing' | 'pat'>('landing');
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [hoverBtn, setHoverBtn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && isConnected) router.replace('/');
  }, [loading, isConnected, router]);

  useEffect(() => {
    if (step === 'pat') setTimeout(() => inputRef.current?.focus(), 50);
  }, [step]);

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
      <div style={S.page}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #eaeaea', borderTopColor: '#202020', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {step === 'landing' ? (
          <>
            <div style={S.logoWrap} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
            <h1 style={S.brand}>Stackby Studio</h1>
            <p style={S.sub}>Sign in to build apps from your Stackby data.</p>

            <button
              onClick={() => setStep('pat')}
              onMouseEnter={() => setHoverBtn(true)}
              onMouseLeave={() => setHoverBtn(false)}
              style={{ ...S.btnPrimary, ...(hoverBtn ? { background: '#373737' } : {}) }}
            >
              Sign in with Stackby →
            </button>

            <div style={S.dividerRow}>
              <div style={S.dividerLine} />
              <span style={S.dividerText}>or</span>
              <div style={S.dividerLine} />
            </div>

            <button onClick={() => setStep('pat')} style={S.linkBtn}>
              Use a Personal Access Token
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setStep('landing'); setError(''); setPat(''); }}
              style={S.backBtn}
            >
              <ArrowLeft size={13} strokeWidth={1.6} /> Back
            </button>

            <div style={S.logoWrap} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
            <h1 style={S.brand}>Stackby Studio</h1>

            <form onSubmit={(e) => void handleConnect(e)} style={{ marginTop: '20px' }}>
              <label style={S.label}>Personal Access Token</label>
              <div style={S.inputWrap}>
                <input
                  ref={inputRef}
                  type={showPat ? 'text' : 'password'}
                  value={pat}
                  onChange={(e) => { setPat(e.target.value); setError(''); }}
                  placeholder="pat_xxxxxxxxxxxxxxxxxx"
                  style={{ ...S.input, ...(error ? { borderColor: '#d32f2f' } : {}) }}
                  autoComplete="off"
                />
                <button type="button" onClick={() => setShowPat((s) => !s)} style={S.eyeBtn}>
                  {showPat ? <EyeOff size={14} strokeWidth={1.6} /> : <Eye size={14} strokeWidth={1.6} />}
                </button>
              </div>

              {error && <p style={S.error}>{error}</p>}

              <button
                type="submit"
                disabled={!pat.trim() || connecting}
                onMouseEnter={() => setHoverBtn(true)}
                onMouseLeave={() => setHoverBtn(false)}
                style={{
                  ...S.btnPrimary,
                  marginTop: '10px',
                  opacity: (!pat.trim() || connecting) ? 0.5 : 1,
                  cursor: pat.trim() ? 'pointer' : 'default',
                  ...(hoverBtn && pat.trim() ? { background: '#373737' } : {}),
                }}
              >
                {connecting ? (
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />
                ) : 'Connect to Stackby →'}
              </button>

              <div style={S.helpBox}>
                <p style={S.helpTitle}>Where to find your PAT</p>
                <p style={S.helpText}>
                  Go to <strong style={{ color: '#202020' }}>stackby.com</strong> → Account Settings → API Keys → Create a Personal Access Token with{' '}
                  <strong style={{ color: '#202020' }}>data.records:read</strong> and{' '}
                  <strong style={{ color: '#202020' }}>schema.bases:read</strong> scopes.
                </p>
                <a href="https://stackby.com/account/api-keys" target="_blank" rel="noopener noreferrer" style={S.helpLink}>
                  Open API Keys <ExternalLink size={11} strokeWidth={1.6} />
                </a>
              </div>
            </form>

            <p style={S.secondaryLink}>
              Don&apos;t have a Stackby account?{' '}
              <a href="https://stackby.com/signup" target="_blank" rel="noopener noreferrer" style={S.secondaryA}>
                Create free account ↗
              </a>
            </p>
          </>
        )}
      </div>

      <p style={S.footer}>
        By signing in you agree to the{' '}
        <a href="https://stackby.com/terms" target="_blank" rel="noopener" style={S.footerLink}>Terms of Service</a>
        {' '}and{' '}
        <a href="https://stackby.com/privacy" target="_blank" rel="noopener" style={S.footerLink}>Privacy Policy</a>.
      </p>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input::placeholder{color:#c8c8c8}`}</style>
    </div>
  );
}
