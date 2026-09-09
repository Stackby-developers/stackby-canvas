import type { Metadata } from 'next';
import { DocsLayout } from '@/components/DocsLayout';

export const metadata: Metadata = { title: 'Concepts' };

export default function ConceptsPage() {
  return (
    <DocsLayout>
      <h1>Concepts</h1>
      <p>Core ideas behind how Stackby Studio works.</p>

      <h2>Artifacts</h2>
      <p>An <strong>artifact</strong> is the output Studio builds from a prompt — a self-contained React app. Artifacts come in eight types:</p>
      <table>
        <thead><tr><th>Type</th><th>Use case</th></tr></thead>
        <tbody>
          {[
            ['dashboard', 'KPI tiles, charts, filterable tables for internal teams'],
            ['portal', 'External-facing view for clients, partners, or customers'],
            ['report', 'Formatted data summary with optional export'],
            ['form', 'Data entry connected to a Stackby table'],
            ['gallery', 'Card grid with images, search, and filters'],
            ['website', 'Public-facing page or product catalogue'],
            ['document', 'Structured document generated from records'],
            ['presentation', 'Slide-style deck from data'],
          ].map(([t, d]) => <tr key={t}><td><code>{t}</code></td><td>{d}</td></tr>)}
        </tbody>
      </table>

      <h2>Stacks</h2>
      <p>A <strong>stack</strong> is a Stackby base — a collection of tables with columns and records. Studio reads stack metadata (table names, column types, relationships) during the schema analysis phase and uses it to generate type-safe data bindings. Studio only accesses stacks you have permission to read via your PAT.</p>

      <h2>Plans</h2>
      <p>A <strong>plan</strong> is the build blueprint generated before any code is written. It lists each component, hook, page, and utility that will be created, along with the specific tables and columns each one accesses. You approve or reject the plan before Studio writes a single line of code — this is the highest-leverage point in the build.</p>
      <p>Plans gate three safety properties:</p>
      <ul>
        <li><strong>Data minimisation</strong> — only listed columns are ever fetched at runtime</li>
        <li><strong>Permission scope hash</strong> — the plan is invalidated if your Stackby permissions change between plan and publish</li>
        <li><strong>Public publish confirmation</strong> — for public visibility, you explicitly acknowledge which tables and columns will become readable by anyone</li>
      </ul>

      <h2>Data bindings</h2>
      <p>A <strong>data binding</strong> declares the relationship between a component and a Stackby table. Each binding specifies:</p>
      <ul>
        <li>The <code>tableId</code> and <code>tableName</code></li>
        <li>The exact <code>columnIds</code> the component may read</li>
        <li>Optional <code>filter</code>, <code>sort</code>, and <code>viewId</code> constraints</li>
      </ul>
      <p>At runtime, all data flows through the Studio Data Gateway, which enforces bindings — requests for tables or columns not declared in the plan are rejected with <code>403 BINDING_NOT_DECLARED</code>.</p>

      <h2>Runs</h2>
      <p>A <strong>run</strong> is a single build execution. Each run produces SSE events you can watch in the builder: <code>intent</code>, <code>schema</code>, <code>clarification</code>, <code>plan</code>, <code>code</code>, <code>build</code>, <code>verify</code>, <code>fix</code>, <code>ready</code>, or <code>failed</code>. You can resume a run's SSE stream after a page reload using the cursor parameter.</p>

      <h2>Credits</h2>
      <p>Credits are consumed when Studio calls the LLM pipeline. Each plan step uses a tiered model (T0–T3) based on complexity. You can preview the credit cost before approving a plan. Credits are workspace-scoped and tracked in the credit ledger.</p>

      <table>
        <thead><tr><th>Tier</th><th>Model class</th><th>When used</th></tr></thead>
        <tbody>
          <tr><td>T0</td><td>Fast small model</td><td>Simple intents, clarification questions</td></tr>
          <tr><td>T1</td><td>Mid model</td><td>Schema analysis, plan generation</td></tr>
          <tr><td>T2</td><td>Balanced model</td><td>Code generation, visual verification</td></tr>
          <tr><td>T3</td><td>Frontier model</td><td>Complex multi-step artifacts</td></tr>
        </tbody>
      </table>
    </DocsLayout>
  );
}
