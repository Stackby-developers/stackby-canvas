import { describe, it, expect } from 'vitest';
import { generatePKCE, buildAuthUrl } from '../auth/sso.js';
import { loadingStateHtml } from '../runtime/loading-state.js';
import { computeContentAddress } from '../deployment/content-address.js';

describe('PKCE', () => {
  it('generates unique code verifiers on each call', () => {
    const a = generatePKCE();
    const b = generatePKCE();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.state).not.toBe(b.state);
  });

  it('code challenge is base64url(SHA-256(codeVerifier))', async () => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    const { createHash } = await import('node:crypto');
    const expected = createHash('sha256').update(codeVerifier).digest('base64url');
    expect(codeChallenge).toBe(expected);
  });

  it('state is a 32-char hex string', () => {
    const { state } = generatePKCE();
    expect(state).toHaveLength(32);
    expect(state).toMatch(/^[a-f0-9]+$/);
  });
});

describe('OAuth auth URL', () => {
  const CONFIG = {
    STACKBY_OAUTH_URL: 'https://stackby.com/oauth',
    STACKBY_CLIENT_ID: 'client_abc',
  } as Parameters<typeof buildAuthUrl>[0];

  it('includes code_challenge and S256 method', () => {
    const pkce = generatePKCE();
    const url = buildAuthUrl(CONFIG, pkce, 'https://studio.stackby.com/auth/callback');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('uses authorization_code flow', () => {
    const url = buildAuthUrl(CONFIG, generatePKCE(), 'https://cb.example.com');
    expect(url).toContain('response_type=code');
  });

  it('includes state parameter', () => {
    const pkce = generatePKCE();
    const url = buildAuthUrl(CONFIG, pkce, 'https://cb.example.com');
    expect(url).toContain(`state=${pkce.state}`);
  });
});

describe('loading state HTML', () => {
  it('title is empty — no flash of unstyled text', () => {
    const html = loadingStateHtml('/main.js', 'tok');
    expect(html).toMatch(/<title><\/title>/);
  });

  it('spinner has aria-hidden to suppress accessibility announcement', () => {
    const html = loadingStateHtml('/main.js', 'tok');
    expect(html).toContain('aria-hidden');
  });

  it('injects runtime token as window.__STACKBY_RUNTIME_TOKEN__', () => {
    const html = loadingStateHtml('/main.js', 'my-secret-token');
    expect(html).toContain('__STACKBY_RUNTIME_TOKEN__');
    expect(html).toContain('"my-secret-token"');
  });

  it('loads runtime script as type=module', () => {
    const html = loadingStateHtml('/main.js', 'tok');
    expect(html).toContain('type="module"');
  });

  it('script src matches provided URL', () => {
    const html = loadingStateHtml('/runtime/v42/main.js', 'tok');
    expect(html).toContain('src="/runtime/v42/main.js"');
  });
});

describe('health route', () => {
  it('GET /health returns 200', async () => {
    const { default: app } = await import('../index.js');
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string };
    expect(body.status).toBe('ok');
  });
});
