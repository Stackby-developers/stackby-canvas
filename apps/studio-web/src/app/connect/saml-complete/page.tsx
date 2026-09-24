'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const PAT_KEY = 'stackby_pat';
const STACKS_KEY = 'stackby_stacks';

export default function SamlCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const samlToken = searchParams.get('saml_token');
    if (!samlToken) {
      setError('Missing session token. Please try signing in again.');
      setStatus('error');
      return;
    }

    fetch(`/api/auth/saml/session?saml_token=${encodeURIComponent(samlToken)}`)
      .then(async (res) => {
        const data = await res.json() as { connected?: boolean; pat?: string; stacks?: Array<{ id: string; name: string }>; error?: string };
        if (!res.ok || !data.connected || !data.pat) {
          throw new Error(data.error ?? 'SSO session expired or invalid.');
        }
        localStorage.setItem(PAT_KEY, data.pat);
        localStorage.setItem(STACKS_KEY, JSON.stringify(data.stacks ?? []));
        router.replace('/');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'SSO sign-in failed.');
        setStatus('error');
      });
  }, [router, searchParams]);

  const S: React.CSSProperties = {
    minHeight: '100vh',
    background: '#fafafa',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    gap: '16px',
  };

  if (status === 'error') {
    return (
      <div style={S}>
        <p style={{ fontSize: '14px', color: '#d32f2f' }}>{error}</p>
        <a href="/connect" style={{ fontSize: '14px', color: '#2D73F5' }}>← Back to sign in</a>
      </div>
    );
  }

  return (
    <div style={S}>
      <div
        role="status"
        aria-label="Completing sign-in"
        style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #eaeaea', borderTopColor: '#202020', animation: 'spin .7s linear infinite' }}
      />
      <p style={{ fontSize: '14px', color: '#686868' }}>Completing SSO sign-in…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
