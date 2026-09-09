import Link from 'next/link';
import { DocsLayout } from '@/components/DocsLayout';

const CARDS = [
  { href: '/quickstart', title: 'Quickstart', desc: 'Build your first artifact in under 5 minutes.' },
  { href: '/concepts', title: 'Concepts', desc: 'Artifacts, stacks, plans, bindings, and credits.' },
  { href: '/builder', title: 'Builder guide', desc: 'Prompts, plan review, visual editing, follow-ups.' },
  { href: '/publishing', title: 'Publishing', desc: 'Visibility modes, custom domains, SSO viewer.' },
  { href: '/api-reference', title: 'API reference', desc: 'All REST endpoints across every service.' },
  { href: '/sdk', title: 'Studio SDK', desc: 'React hooks for data-bound components.' },
  { href: '/security', title: 'Security model', desc: 'Data isolation, permissions, audit logging.' },
];

export default function HomePage() {
  return (
    <DocsLayout>
      <h1>Stackby Studio</h1>
      <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
        Build custom apps, dashboards, and portals from your Stackby data — describe what you want, review the plan, and publish in minutes.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} style={{
            display: 'block', padding: '1.25rem', borderRadius: '10px',
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text)', textDecoration: 'none',
          }}>
            <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '.25rem' }}>{c.title}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{c.desc}</p>
          </Link>
        ))}
      </div>

      <h2>What is Stackby Studio?</h2>
      <p>Studio is an AI-powered artifact builder that turns a plain-English prompt into a working React app connected to your Stackby data — without writing code. Describe your goal, review the generated plan, approve it, and Studio builds and deploys the artifact automatically.</p>

      <h2>How it works</h2>
      <ol>
        <li><strong>Prompt</strong> — Describe what you want to build and pick a Stackby stack as the data source.</li>
        <li><strong>Plan review</strong> — The AI generates a step-by-step build plan showing which components it will create and which tables/columns they will bind to. You approve or reject.</li>
        <li><strong>Build</strong> — Studio generates React + TypeScript + Tailwind code in a sandboxed environment, runs type-checking, and takes a screenshot for visual verification.</li>
        <li><strong>Iterate</strong> — Use the follow-up bar to refine, or open the visual editor to tweak tokens and annotate components.</li>
        <li><strong>Publish</strong> — Deploy to a <code>{'{slug}'}.studio.stackby.com</code> URL with configurable visibility and optional custom domain.</li>
      </ol>
    </DocsLayout>
  );
}
