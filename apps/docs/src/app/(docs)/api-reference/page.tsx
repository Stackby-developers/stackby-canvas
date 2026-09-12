import type { Metadata } from 'next';
import { DocsLayout } from '@/components/DocsLayout';

export const metadata: Metadata = { title: 'API reference' };

const BADGE = (method: string) => {
  const colors: Record<string, string> = { GET: '#2D7FF9', POST: '#16a34a', PATCH: '#d97706', DELETE: '#dc2626' };
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${colors[method] ?? '#888'}22`, color: colors[method] ?? '#888' }}>{method}</span>;
};

export default function ApiReferencePage() {
  return (
    <DocsLayout>
      <h1>API reference</h1>
      <p>All REST endpoints. The Next.js app (<code>apps/studio-web</code>) proxies to each service — use <code>/api/...</code> paths from the browser. Direct service ports are for server-to-server calls only.</p>

      <h2>apps/api — port 4000</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
        <tbody>
          {[
            ['GET', '/v1/credits/balance', 'Workspace credit balance and totals'],
            ['GET', '/v1/credits/history', 'Ledger entries (limit, offset, workspaceId)'],
            ['POST', '/v1/credits/preview', 'Estimate cost for a set of LLM calls'],
            ['POST', '/v1/credits/debit', 'Debit credits for a completed run'],
            ['GET', '/v1/projects', 'List projects for a workspace'],
            ['POST', '/v1/projects', 'Create project and start a generation run'],
            ['GET', '/admin/artifacts', 'Admin: list all published artifacts'],
            ['POST', '/admin/force-unpublish', 'Admin: unpublish a deployment by ID'],
            ['GET', '/admin/audit', 'Admin: query audit log with filters'],
            ['GET|PUT', '/admin/policy', 'Admin: get/update workspace policy'],
            ['GET', '/admin/usage', 'Admin: credit usage aggregated by period'],
          ].map(([m, p, d]) => <tr key={p}><td>{BADGE(m.split('|')[0]!)}</td><td><code>{p}</code></td><td>{d}</td></tr>)}
        </tbody>
      </table>

      <h2>services/orchestrator — port 3004</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
        <tbody>
          {[
            ['POST', '/run', 'Start a generation run (returns runId)'],
            ['GET', '/run/:runId/sse', 'SSE stream of run events (?from=cursor)'],
            ['POST', '/run/:runId/signal', 'Send plan-approve / clarify / cancel signal'],
            ['POST', '/run/:runId/visual-edit', 'Start a visual edit workflow'],
            ['POST', '/run/:runId/annotations', 'Submit annotations for patch workflow'],
            ['POST', '/template/:templateId/remap', 'Remap template bindings to a new stack'],
          ].map(([m, p, d]) => <tr key={p}><td>{BADGE(m)}</td><td><code>{p}</code></td><td>{d}</td></tr>)}
        </tbody>
      </table>

      <h2>services/publish — port 3006</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
        <tbody>
          {[
            ['POST', '/publish', 'Create a new deployment'],
            ['GET', '/publish/:slug/meta', 'Deployment metadata (visibility, slug, IDs)'],
            ['POST', '/publish/:slug/check-password', 'Verify password (rate-limited 10/15min)'],
            ['PATCH', '/publish/:deploymentId/domain', 'Set or clear custom domain'],
            ['GET', '/publish/:deploymentId/versions', 'List deployment versions'],
            ['POST', '/publish/:deploymentId/rollback', 'Roll back to a prior version'],
            ['POST', '/publish/:deploymentId/unpublish', 'Unpublish a deployment'],
            ['GET', '/serve/:slug/*', 'Serve artifact HTML (enforces visibility)'],
            ['GET', '/auth/start', 'Start Stackby OAuth2 PKCE flow for viewers'],
            ['GET', '/auth/callback', 'OAuth2 callback — sets __studio_session cookie'],
          ].map(([m, p, d]) => <tr key={p}><td>{BADGE(m)}</td><td><code>{p}</code></td><td>{d}</td></tr>)}
        </tbody>
      </table>

      <h2>services/git — port 3008</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
        <tbody>
          {[
            ['POST', '/git/install/:provider', 'Register a GitHub/GitLab installation token'],
            ['POST', '/git/export/new', 'Export to a new repo'],
            ['POST', '/git/export/existing', 'Export as a PR to an existing repo'],
            ['POST', '/git/push/:linkId', 'Push an update to an already-linked repo'],
            ['GET', '/git/sync/:linkId', 'Check read-back sync status'],
            ['GET', '/git/links/project/:projectId', 'Get the repo link for a project'],
            ['GET|POST', '/git/policy/:workspaceId', 'Get/set workspace git export policy'],
          ].map(([m, p, d]) => <tr key={p}><td>{BADGE(m.split('|')[0]!)}</td><td><code>{p}</code></td><td>{d}</td></tr>)}
        </tbody>
      </table>

      <h2>services/design — port 3007</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
        <tbody>
          {[
            ['GET', '/design-systems', 'List workspace design systems'],
            ['GET', '/design-systems/:id', 'Get a single design system'],
            ['PATCH', '/design-systems/:id', 'Update design tokens'],
            ['POST', '/design-systems/:id/extract', 'Extract tokens from a URL (SSE-streamed)'],
          ].map(([m, p, d]) => <tr key={p}><td>{BADGE(m)}</td><td><code>{p}</code></td><td>{d}</td></tr>)}
        </tbody>
      </table>
    </DocsLayout>
  );
}
