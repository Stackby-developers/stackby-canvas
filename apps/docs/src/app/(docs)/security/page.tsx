import type { Metadata } from 'next';
import { DocsLayout } from '@/components/DocsLayout';

export const metadata: Metadata = { title: 'Security model' };

export default function SecurityPage() {
  return (
    <DocsLayout>
      <h1>Security model</h1>
      <p>How Stackby Studio isolates data, enforces access, and protects published artifacts.</p>

      <h2>Data Gateway — the only path to Stackby</h2>
      <p>All Stackby data access from a generated artifact goes through the <strong>Data Gateway</strong> (<code>services/gateway</code>), never directly to Stackby. The gateway enforces, in order:</p>
      <ol>
        <li><strong>JWT authentication</strong> — Studio session tokens and signed artifact runtime tokens</li>
        <li><strong>Permission scope hash</strong> — computed over visible tables, views, columns, and row filters at build time. If your Stackby permissions change, the hash changes and the deploy is invalidated.</li>
        <li><strong>Binding validation</strong> — requests for tables or columns not declared in the plan are rejected <code>403 BINDING_NOT_DECLARED</code></li>
        <li><strong>Cache isolation</strong> — cache keys include the permission scope hash; entries are never shared across permission scopes</li>
        <li><strong>Column masking</strong> — hidden columns are structurally absent from responses, not null</li>
        <li><strong>Rate limiting</strong> — 4 rps per stack, token-bucket algorithm; callers block, never see 429</li>
      </ol>

      <h2>Workspace isolation</h2>
      <p>All database tables (projects, runs, artifacts, credit ledger, audit log) have <code>ROW LEVEL SECURITY</code> enabled with isolation policies keyed on <code>app.current_workspace_id</code>. A workspace can never read another workspace's data through any API path.</p>

      <h2>Published artifact security</h2>
      <p>The publish serve-route enforces visibility before returning any HTML:</p>
      <ul>
        <li><code>public</code> / <code>link</code> — no auth check, full CDN caching allowed</li>
        <li><code>password</code> — requires <code>__ap_{'{deploymentId}'}</code> httpOnly cookie (set on password verification, 1h TTL); 10 attempts/15min rate limit per IP</li>
        <li><code>workspace</code> / <code>stack_collaborators</code> — requires valid <code>__studio_session</code> JWT from the publish service's Stackby OAuth2 PKCE flow; <code>Cache-Control: private, no-store</code></li>
      </ul>

      <h2>Content Security Policy</h2>
      <p>Every served artifact HTML gets a strict CSP:</p>
      <pre>{`default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' {gateway-origin};
img-src 'self' data: blob:;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';`}</pre>
      <p><code>unsafe-eval</code> is never present. <code>frame-ancestors 'none'</code> prevents clickjacking. The <code>connect-src</code> allowlist contains only the Studio Data Gateway origin — artifacts cannot make arbitrary network requests.</p>

      <h2>Build sandbox</h2>
      <p>Generated code is built in a Firecracker microVM sandbox with no outbound network access. The secret scanner runs before any Git push to block accidental credential exposure.</p>

      <h2>Audit log</h2>
      <p>All administrative and security-relevant actions are written to a hash-chained audit log. Each entry includes <code>workspaceId</code>, <code>actorId</code>, <code>action</code>, <code>resourceType</code>, <code>resourceId</code>, <code>metadata</code>, and a SHA-256 <code>chainHash</code> computed over the previous entry. Chain integrity can be verified via <code>GET /admin/audit?verify=true</code>. Audit logs are retained for 7 years (SOC 2 requirement).</p>

      <h2>Data retention</h2>
      <table>
        <thead><tr><th>Data type</th><th>Default retention</th></tr></thead>
        <tbody>
          <tr><td>Runs and artifacts</td><td>90 days</td></tr>
          <tr><td>Credit ledger</td><td>7 years</td></tr>
          <tr><td>Audit log</td><td>7 years</td></tr>
        </tbody>
      </table>
      <p>Workspace admins can configure custom retention periods (minimum 30 days for runs). The retention job runs nightly and hard-deletes expired records; credit ledger entries older than 7 years are anonymised rather than deleted.</p>

      <h2>Responsible disclosure</h2>
      <p>To report a security vulnerability, email <strong>security@stackby.com</strong> with a description and reproduction steps. We acknowledge reports within 24 hours and aim to patch critical issues within 72 hours.</p>
    </DocsLayout>
  );
}
