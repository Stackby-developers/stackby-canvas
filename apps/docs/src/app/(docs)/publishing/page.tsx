import type { Metadata } from 'next';
import { DocsLayout } from '@/components/DocsLayout';

export const metadata: Metadata = { title: 'Publishing' };

export default function PublishingPage() {
  return (
    <DocsLayout>
      <h1>Publishing</h1>
      <p>Deploy your artifact and control who can access it.</p>

      <h2>Visibility modes</h2>
      <table>
        <thead><tr><th>Mode</th><th>Who can view</th><th>Auth required</th></tr></thead>
        <tbody>
          <tr><td><code>stack_collaborators</code></td><td>Anyone with Stackby access to the connected stack</td><td>Stackby OAuth (SSO)</td></tr>
          <tr><td><code>workspace</code></td><td>All members of your Studio workspace</td><td>Stackby OAuth (SSO)</td></tr>
          <tr><td><code>link</code></td><td>Anyone with the URL</td><td>None</td></tr>
          <tr><td><code>password</code></td><td>Anyone who knows the password</td><td>Password gate</td></tr>
          <tr><td><code>public</code></td><td>Anyone on the internet</td><td>None — requires explicit confirmation</td></tr>
        </tbody>
      </table>
      <div className="callout warn">
        <strong>Public visibility</strong> requires you to review and confirm which tables and columns will become world-readable. This is an irreversible disclosure of data — use it only for genuinely public information.
      </div>

      <h2>The publish flow</h2>
      <ol>
        <li>Click <strong>Publish</strong> in the builder header (only enabled once a build is ready)</li>
        <li>Optionally enter a custom URL slug (e.g. <code>my-sales-dashboard</code>)</li>
        <li>Choose a visibility mode</li>
        <li>For <code>password</code>: enter the password</li>
        <li>For <code>public</code>: review the data disclosure and check the confirmation box</li>
        <li>Click <strong>Publish →</strong></li>
      </ol>
      <p>The artifact is deployed to <code>{'{slug}'}.studio.stackby.com</code> within seconds.</p>

      <h2>Version history and rollback</h2>
      <p>Every publish creates an immutable version. The done step of the publish panel shows version history — click <strong>Restore</strong> on any prior version to roll back instantly without redeploying.</p>

      <h2>Custom domains</h2>
      <p>After publishing, enter a custom domain (e.g. <code>app.yourcompany.com</code>) in the custom domain field. Studio will display the CNAME record to add:</p>
      <pre>{`CNAME app.yourcompany.com → your-slug.studio.stackby.com`}</pre>
      <p>DNS propagation typically takes 1–15 minutes. Once propagated, the artifact is accessible from your domain.</p>

      <h2>SSO viewer auth</h2>
      <p>For <code>workspace</code> and <code>stack_collaborators</code> artifacts, viewers who hit <code>/p/{'{slug}'}</code> see a "Sign in with Stackby" gate. Clicking it starts a PKCE OAuth2 flow via Stackby — after auth, they are redirected back to the artifact automatically. The session cookie is scoped to the publish service and expires after 1 hour.</p>

      <h2>Unpublishing</h2>
      <p>Unpublishing via the Admin Console (force-unpublish) or the rollback API sets an <code>unpublishedAt</code> timestamp on the deployment. The viewer shows a 410 "no longer available" page within 60 seconds (CDN TTL). Unpublishing is permanent — the slug is freed for reuse after 24 hours.</p>
    </DocsLayout>
  );
}
