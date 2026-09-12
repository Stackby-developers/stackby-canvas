import type { Metadata } from 'next';
import { DocsLayout } from '@/components/DocsLayout';

export const metadata: Metadata = { title: 'Builder guide' };

export default function BuilderPage() {
  return (
    <DocsLayout>
      <h1>Builder guide</h1>
      <p>Everything you can do inside the builder shell after a run starts.</p>

      <h2>Writing effective prompts</h2>
      <p>Good prompts include <strong>who</strong> will use the artifact, <strong>what data</strong> they need to see, and any <strong>constraints</strong>. Compare:</p>
      <table>
        <thead><tr><th>Weak</th><th>Strong</th></tr></thead>
        <tbody>
          <tr><td>Show my data</td><td>Build a sales pipeline dashboard for account executives, showing deal stage, owner, and close date filtered to open deals only</td></tr>
          <tr><td>Employee thing</td><td>Create an employee directory for HR with search by name, filter by department, and photo from the Avatar column</td></tr>
        </tbody>
      </table>
      <p>You can also attach files (images, CSV, PDF) as context using the attachment tray — useful for mocking up a design or providing sample data.</p>

      <h2>Plan review</h2>
      <p>The plan review panel is the most important screen in Studio. Before approving:</p>
      <ul>
        <li>Check that every component has the right tables — if a component lists a table you didn't intend to expose, reject and refine your prompt</li>
        <li>Review the estimated credits — complex multi-table artifacts use more</li>
        <li>If Studio asks clarification questions, answer them to improve the plan quality</li>
      </ul>
      <p>Rejecting a plan shows a text area to explain why. Studio uses that feedback to generate a revised plan.</p>

      <h2>Run cards</h2>
      <p>Each phase emits a run card in the left panel. Cards are collapsible. After a build completes, a rating chip appears — thumbs up/down helps Studio improve future builds. The SSE stream is cursor-resumable, so refreshing the page reconnects without losing history.</p>

      <h2>Preview</h2>
      <p>The preview iframe renders your artifact against live Stackby data through the Data Gateway. Use the breakpoint switcher (375 / 768 / 1440px) to check mobile and desktop layouts. The preview updates automatically when a visual edit is applied.</p>

      <h2>Visual editing</h2>
      <p>Open the Properties Rail (panel icon in the header) to access three tabs:</p>
      <ul>
        <li><strong>Properties</strong> — select a component, pick a CSS property, and type a value. Values snap to the nearest design token automatically (6% tolerance). Undo/redo is available — up to 50 steps.</li>
        <li><strong>Tokens</strong> — browse all CSS custom properties grouped by category (colour, typography, spacing, radii, shadows). Click to copy a token name.</li>
        <li><strong>Annotations</strong> — mark components as needing changes with critical/minor severity. Submit a batch of annotations; Studio runs the annotation patch workflow.</li>
      </ul>

      <h2>Follow-up prompts</h2>
      <p>The follow-up bar at the bottom of the conversation panel accepts natural language changes after the initial build. Examples:</p>
      <pre>{`"Add a date range filter to the top of the dashboard"
"Change the chart from bar to line"
"Make the status column show coloured badges"`}</pre>
      <p>Each follow-up starts a new run linked to the same project.</p>

      <h2>Git export</h2>
      <p>Click <strong>Export</strong> in the header to push the artifact source to GitHub or GitLab. On first export, choose to create a new repo or open a PR on an existing one. Subsequent exports show a push-update form with an optional PR toggle. See the publishing guide for post-export sync.</p>
    </DocsLayout>
  );
}
