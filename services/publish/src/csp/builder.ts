import type { ArtifactPermissions } from '../deployment/types.js';

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'Permissions-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Cross-Origin-Opener-Policy': string;
}

/**
 * Build strict security headers for a published artifact.
 * script-src 'self'; connect-src 'self' + gateway only.
 * No third-party egress from a published artifact.
 */
export function buildSecurityHeaders(
  gatewayOrigin: string,
  permissions: ArtifactPermissions,
): SecurityHeaders {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${gatewayOrigin}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "report-uri /csp-report",
  ].join('; ');

  const ppEntries: string[] = [
    `geolocation=(${permissions.geolocation ? 'self' : ''})`,
    `camera=(${permissions.camera ? 'self' : ''})`,
    `clipboard-read=(${permissions.clipboardRead ? 'self' : ''})`,
    `clipboard-write=(${permissions.clipboardWrite ? 'self' : ''})`,
    'microphone=()',
    'payment=()',
  ];

  return {
    'Content-Security-Policy': csp,
    'Permissions-Policy': ppEntries.join(', '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}
