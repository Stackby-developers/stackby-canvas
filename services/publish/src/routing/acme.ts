/**
 * ACME/Let's Encrypt TLS certificate provisioning stub.
 *
 * PRODUCTION WIRING REQUIRED:
 * 1. Install `acme-client` npm package
 * 2. Generate an ACME account key and store in a secret manager
 * 3. Implement DNS-01 or HTTP-01 challenge via your DNS provider API
 * 4. Store issued certificates in object storage (MinIO) and rotate on expiry
 * 5. Load certificates into the Fastify TLS context dynamically via SNI callbacks
 *
 * For the hosted platform, delegate TLS termination to your CDN (Cloudflare/Fastly)
 * using their Origin CA certificates rather than Let's Encrypt directly.
 */
export async function provisionTlsCertificate(domain: string): Promise<{ cert: string; key: string }> {
  throw new Error(
    `ACME TLS provisioning is not configured for domain "${domain}". ` +
    'See src/routing/acme.ts for production wiring instructions.',
  );
}

export async function verifyCnameRecord(domain: string, expectedTarget: string): Promise<boolean> {
  const { promises: dns } = await import('node:dns');
  try {
    const addresses = await dns.resolveCname(domain);
    return addresses.some((a) => a.toLowerCase().includes(expectedTarget.toLowerCase()));
  } catch {
    return false;
  }
}
