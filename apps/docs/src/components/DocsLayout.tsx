import type { ReactNode } from 'react';
import Link from 'next/link';

const NAV = [
  { label: 'Getting started', href: '/quickstart' },
  { label: 'Concepts', href: '/concepts' },
  { label: 'Builder guide', href: '/builder' },
  { label: 'Publishing', href: '/publishing' },
  { label: 'API reference', href: '/api-reference' },
  { label: 'Studio SDK', href: '/sdk' },
  { label: 'Security model', href: '/security' },
];

export function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--bg-sidebar)', padding: '1.5rem 0', position: 'sticky',
        top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 600, fontSize: '15px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M12 3 3 7l9 4 9-4-9-4Z" /><path d="m3 12 9 4 9-4" />
            </svg>
            Studio Docs
          </Link>
        </div>
        <nav style={{ padding: '0 .75rem' }}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block', padding: '.4rem .5rem', borderRadius: '6px',
                fontSize: '14px', color: 'var(--text-muted)',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '1.5rem 1.25rem 0', borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.5 }}>
            Stackby Studio<br />v0.17.0 · Phase 4
          </p>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: '800px', padding: '3rem 3rem 6rem', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
