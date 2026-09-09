import type { Metadata } from 'next';
import { DocsLayout } from '@/components/DocsLayout';

export const metadata: Metadata = { title: 'Quickstart' };

export default function QuickstartPage() {
  return (
    <DocsLayout>
      <h1>Quickstart</h1>
      <p>Get from zero to a live artifact in under 5 minutes.</p>

      <h2>Prerequisites</h2>
      <ul>
        <li>A Stackby account with at least one stack containing data</li>
        <li>A Stackby Personal Access Token (PAT) with <code>data.records:read</code> and <code>schema.bases:read</code> scopes</li>
        <li>Studio credit balance ≥ 10 (free tier includes 50 starter credits)</li>
      </ul>

      <h2>Step 1 — Connect your Stackby account</h2>
      <p>Go to <strong>studio.stackby.com/connect</strong> and enter your PAT. Studio verifies the token, lists your accessible stacks, and redirects you to the Home surface.</p>
      <div className="callout">
        Find your PAT at <strong>stackby.com → Account Settings → API Keys</strong>. Create a new token and copy it — it won't be shown again.
      </div>

      <h2>Step 2 — Write a prompt</h2>
      <p>On the Home surface, type what you want to build in the prompt composer. Be specific about the purpose, audience, and data you want to show. Examples that work well:</p>
      <pre>{`"Build a task dashboard showing overdue items for my project team"
"Create a sales pipeline by stage for the Sales stack"
"Make an employee directory with department filter"`}</pre>
      <p>Select the Stackby stack to connect to using the stack picker below the prompt. Then click the send button.</p>

      <h2>Step 3 — Review the plan</h2>
      <p>Studio analyses your intent, inspects your stack's schema, and generates a build plan. The Plan Review panel shows:</p>
      <ul>
        <li>Each component that will be created and what tables/columns it binds to</li>
        <li>The estimated credit cost for this build</li>
      </ul>
      <p>Click <strong>Approve plan</strong> to proceed or <strong>Reject</strong> to revise your prompt.</p>

      <h2>Step 4 — Watch the build</h2>
      <p>Run cards stream in the left panel showing progress: schema analysis → code generation → type-check → visual verify → ready. The preview iframe on the right loads your artifact against live data as soon as the build completes.</p>

      <h2>Step 5 — Publish</h2>
      <p>Click <strong>Publish</strong> in the top-right corner. Choose a URL slug (or use the auto-generated one), set visibility, and publish. Your artifact is live at <code>{'{slug}'}.studio.stackby.com</code>.</p>

      <h2>Next steps</h2>
      <ul>
        <li><a href="/builder">Builder guide</a> — follow-up prompts, visual editing, annotations</li>
        <li><a href="/publishing">Publishing guide</a> — visibility modes, custom domains, SSO</li>
        <li><a href="/concepts">Concepts</a> — how artifacts, plans, and bindings work</li>
      </ul>
    </DocsLayout>
  );
}
