import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Stackby Studio Docs', template: '%s — Stackby Studio Docs' },
  description: 'Documentation for Stackby Studio — build apps from your Stackby data.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --bg: #fff; --bg-sidebar: #f7f7f7; --border: #e8e8e8;
            --text: #202020; --text-muted: #686868; --text-faint: #9b9b9b;
            --accent: #2D7FF9; --accent-bg: #eff5ff;
            --code-bg: #f4f4f4; --code-border: #e4e4e4;
            --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          body { font-family: var(--font); color: var(--text); background: var(--bg); line-height: 1.6; }
          a { color: var(--accent); text-decoration: none; }
          a:hover { text-decoration: underline; }
          code { font-family: var(--font-mono); font-size: .875em; background: var(--code-bg); border: 1px solid var(--code-border); padding: .1em .35em; border-radius: 4px; }
          pre { background: var(--code-bg); border: 1px solid var(--code-border); border-radius: 8px; padding: 1rem 1.25rem; overflow-x: auto; font-size: .875rem; line-height: 1.7; }
          pre code { background: none; border: none; padding: 0; font-size: inherit; }
          h1 { font-size: 1.875rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: 1rem; }
          h2 { font-size: 1.25rem; font-weight: 600; letter-spacing: -.01em; margin: 2rem 0 .75rem; padding-top: 2rem; border-top: 1px solid var(--border); }
          h2:first-of-type { margin-top: 1.5rem; padding-top: 0; border-top: none; }
          h3 { font-size: 1rem; font-weight: 600; margin: 1.5rem 0 .5rem; }
          p { margin-bottom: 1rem; color: var(--text); }
          ul, ol { margin: 0 0 1rem 1.5rem; }
          li { margin-bottom: .25rem; }
          table { width: 100%; border-collapse: collapse; font-size: .9rem; margin-bottom: 1.5rem; }
          th { text-align: left; font-weight: 600; padding: .5rem .75rem; background: var(--bg-sidebar); border: 1px solid var(--border); }
          td { padding: .5rem .75rem; border: 1px solid var(--border); vertical-align: top; }
          .callout { border-left: 3px solid var(--accent); background: var(--accent-bg); padding: .75rem 1rem; border-radius: 0 6px 6px 0; margin-bottom: 1rem; font-size: .9rem; }
          .callout.warn { border-color: #f59e0b; background: #fffbeb; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
