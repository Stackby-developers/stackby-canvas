'use client';

import { useEffect, useState, useRef } from 'react';
import { Eye, EyeOff, Lock, LogIn, AlertCircle } from 'lucide-react';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#686868" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3 3 7l9 4 9-4-9-4Z"/><path d="m3 12 9 4 9-4"/></svg>`;
const PUBLISH_URL = process.env['NEXT_PUBLIC_PUBLISH_URL'] ?? 'http://localhost:3006';

type Visibility = 'stack_collaborators' | 'workspace' | 'link' | 'password' | 'public';
type LoadState = 'loading' | 'not_found' | 'unpublished' | 'password_required' | 'auth_required' | 'ready';

interface DeploymentMeta {
  slug: string;
  deploymentId: string;
  projectId: string;
  visibility: Visibility;
  publishedAt: string;
  permissions?: { camera?: boolean; geolocation?: boolean; clipboardRead?: boolean; clipboardWrite?: boolean };
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  card: { width: '400px', maxWidth: '100%', background: '#fff', border: '1px solid #eaeaea', borderRadius: '8px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.04)' },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: '14px' },
  heading: { textAlign: 'center', fontSize: '16px', fontWeight: 600, color: '#202020', letterSpacing: '-.01em', margin: '0 0 6px' } as React.CSSProperties,
  sub: { textAlign: 'center', fontSize: '13px', color: '#686868', margin: '0 0 24px', lineHeight: 1.5 } as React.CSSProperties,
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#202020', marginBottom: '6px' },
  inputWrap: { position: 'relative', marginBottom: '12px' },
  input: { width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #eaeaea', background: '#fff', color: '#202020', fontSize: '14px', padding: '0 36px 0 12px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 120ms' },
  eyeBtn: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9b9b9b', cursor: 'pointer', padding: 0, display: 'flex' },
  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', height: '38px', borderRadius: '6px', background: '#202020', color: '#fff', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', letterSpacing: '-.01em', transition: 'background 120ms' },
  btnDisabled: { opacity: 0.5, cursor: 'default' },
  error: { fontSize: '13px', color: '#d32f2f', margin: '0 0 12px', textAlign: 'center' } as React.CSSProperties,
  footer: { marginTop: '20px', fontSize: '12px', color: '#9b9b9b', textAlign: 'center' } as React.CSSProperties,
  footerLink: { color: '#686868', textDecoration: 'underline', textUnderlineOffset: '2px' },
  iconWrap: { display: 'flex', justifyContent: 'center', marginBottom: '16px' },
  iconCircle: { width: '44px', height: '44px', borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iframe: { position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' },
  spinner: { width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' },
};

function Spinner() {
  return <div style={S.spinner} />;
}

function GateCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={S.page}>
      <div style={S.card}>{children}</div>
      <p style={S.footer}>
        Powered by{' '}
        <a href="https://stackby.com" target="_blank" rel="noopener noreferrer" style={S.footerLink}>
          Stackby Studio
        </a>
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input::placeholder{color:#c8c8c8} input:focus{border-color:#202020!important}`}</style>
    </div>
  );
}

function NotFoundGate() {
  return (
    <GateCard>
      <div style={S.iconWrap}>
        <div style={S.iconCircle}>
          <AlertCircle size={20} strokeWidth={1.5} color="#9b9b9b" />
        </div>
      </div>
      <h1 style={S.heading}>Artifact not found</h1>
      <p style={S.sub}>This link doesn&apos;t exist or may have been moved.</p>
      <a href="/" style={{ ...S.btn, textDecoration: 'none', marginTop: '4px' }}>
        Go to Studio
      </a>
    </GateCard>
  );
}

function UnpublishedGate() {
  return (
    <GateCard>
      <div style={S.iconWrap}>
        <div style={S.iconCircle}>
          <AlertCircle size={20} strokeWidth={1.5} color="#9b9b9b" />
        </div>
      </div>
      <h1 style={S.heading}>This artifact is no longer available</h1>
      <p style={S.sub}>The owner has taken it down.</p>
    </GateCard>
  );
}

function AuthGate({ slug }: { slug: string }) {
  return (
    <GateCard>
      <div style={S.logoWrap} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
      <h1 style={S.heading}>Sign in to view</h1>
      <p style={S.sub}>This artifact is only available to workspace members.</p>
      <a
        href={`/connect?next=/p/${slug}`}
        style={{ ...S.btn, textDecoration: 'none', marginTop: '4px' }}
      >
        <LogIn size={15} strokeWidth={1.6} />
        Sign in with Stackby
      </a>
    </GateCard>
  );
}

function PasswordGate({ slug, onUnlock }: { slug: string; onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || checking) return;
    setChecking(true);
    setError('');
    try {
      const res = await fetch(`/api/publish/${slug}/check-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { allowed: boolean };
      if (data.allowed) {
        onUnlock();
      } else {
        setError('Incorrect password. Try again.');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <GateCard>
      <div style={S.iconWrap}>
        <div style={S.iconCircle}>
          <Lock size={18} strokeWidth={1.5} color="#686868" />
        </div>
      </div>
      <h1 style={S.heading}>Password protected</h1>
      <p style={S.sub}>Enter the password to view this artifact.</p>

      <form onSubmit={(e) => void handleSubmit(e)}>
        <label style={S.label}>Password</label>
        <div style={S.inputWrap}>
          <input
            ref={inputRef}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Enter password"
            style={{ ...S.input, ...(error ? { borderColor: '#d32f2f' } : {}) }}
          />
          <button type="button" onClick={() => setShowPwd((s) => !s)} style={S.eyeBtn}>
            {showPwd ? <EyeOff size={14} strokeWidth={1.6} /> : <Eye size={14} strokeWidth={1.6} />}
          </button>
        </div>

        {error && <p style={S.error}>{error}</p>}

        <button
          type="submit"
          disabled={!password.trim() || checking}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            ...S.btn,
            ...(!password.trim() || checking ? S.btnDisabled : {}),
            ...(hovered && password.trim() && !checking ? { background: '#373737' } : {}),
          }}
        >
          {checking ? <Spinner /> : 'Unlock →'}
        </button>
      </form>
    </GateCard>
  );
}

function LoadingScreen() {
  return (
    <div style={{ ...S.page, gap: '12px' }}>
      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #eaeaea', borderTopColor: '#686868', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function PublishedArtifactPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [state, setState] = useState<LoadState>('loading');
  const [meta, setMeta] = useState<DeploymentMeta | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/publish/${slug}/meta`);
        if (res.status === 404) { setState('not_found'); return; }
        if (res.status === 410) { setState('unpublished'); return; }
        const data = (await res.json()) as DeploymentMeta;
        setMeta(data);

        if (data.visibility === 'password') {
          setState('password_required');
        } else if (data.visibility === 'workspace' || data.visibility === 'stack_collaborators') {
          setState('auth_required');
        } else {
          setState('ready');
        }
      } catch {
        setState('not_found');
      }
    }
    void load();
  }, [slug]);

  if (state === 'loading') return <LoadingScreen />;
  if (state === 'not_found') return <NotFoundGate />;
  if (state === 'unpublished') return <UnpublishedGate />;
  if (state === 'auth_required') return <AuthGate slug={slug} />;
  if (state === 'password_required' && !unlocked) {
    return <PasswordGate slug={slug} onUnlock={() => { setUnlocked(true); setState('ready'); }} />;
  }

  const iframeSrc = `${PUBLISH_URL}/serve/${slug}/`;
  const title = meta ? `${meta.slug} — Stackby Studio` : 'Stackby Studio';

  return (
    <>
      <title>{title}</title>
      <iframe
        src={iframeSrc}
        style={S.iframe}
        title={title}
        allow={[
          meta?.permissions?.camera ? 'camera' : '',
          meta?.permissions?.geolocation ? 'geolocation' : '',
          meta?.permissions?.clipboardRead ? 'clipboard-read' : '',
          meta?.permissions?.clipboardWrite ? 'clipboard-write' : '',
        ].filter(Boolean).join('; ')}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </>
  );
}

