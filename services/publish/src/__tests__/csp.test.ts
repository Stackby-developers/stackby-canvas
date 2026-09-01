import { describe, it, expect } from 'vitest';
import { buildSecurityHeaders } from '../csp/builder.js';

const GATEWAY = 'https://gateway.studio.stackby.com';
const NO_PERMS = { camera: false, clipboardRead: false, clipboardWrite: false, geolocation: false };

describe('CSP header builder', () => {
  it('restricts connect-src to self + gateway only (no *)', () => {
    const h = buildSecurityHeaders(GATEWAY, NO_PERMS);
    const csp = h['Content-Security-Policy'];
    expect(csp).toContain(`connect-src 'self' ${GATEWAY}`);
    expect(csp).not.toContain('*');
  });

  it('script-src is self only — no external CDNs', () => {
    const csp = buildSecurityHeaders(GATEWAY, NO_PERMS)['Content-Security-Policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/cdn\.|unpkg|jsdelivr/);
  });

  it('frame-ancestors none prevents embedding', () => {
    const csp = buildSecurityHeaders(GATEWAY, NO_PERMS)['Content-Security-Policy'];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(buildSecurityHeaders(GATEWAY, NO_PERMS)['X-Frame-Options']).toBe('DENY');
  });

  it('includes report-uri for CSP violation reporting', () => {
    const csp = buildSecurityHeaders(GATEWAY, NO_PERMS)['Content-Security-Policy'];
    expect(csp).toContain('report-uri');
  });

  it('Permissions-Policy grants camera=(self) when camera=true', () => {
    const h = buildSecurityHeaders(GATEWAY, { ...NO_PERMS, camera: true });
    expect(h['Permissions-Policy']).toContain('camera=(self)');
  });

  it('Permissions-Policy has camera=() when camera=false', () => {
    const h = buildSecurityHeaders(GATEWAY, NO_PERMS);
    expect(h['Permissions-Policy']).toContain('camera=()');
  });

  it('microphone is always denied regardless of artifact permissions', () => {
    const h = buildSecurityHeaders(GATEWAY, { ...NO_PERMS, camera: true });
    expect(h['Permissions-Policy']).toContain('microphone=()');
  });

  it('X-Content-Type-Options is nosniff', () => {
    expect(buildSecurityHeaders(GATEWAY, NO_PERMS)['X-Content-Type-Options']).toBe('nosniff');
  });

  it('clipboard-read granted only when declared', () => {
    const withClip = buildSecurityHeaders(GATEWAY, { ...NO_PERMS, clipboardRead: true });
    const noClip = buildSecurityHeaders(GATEWAY, NO_PERMS);
    expect(withClip['Permissions-Policy']).toContain('clipboard-read=(self)');
    expect(noClip['Permissions-Policy']).toContain('clipboard-read=()');
  });
});
