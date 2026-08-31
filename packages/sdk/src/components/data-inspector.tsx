import { useContext, useEffect, useState } from 'react';
import { StackbyContext } from '../internal/context.js';

/** Dev-only: shows data provenance for every visible value. Place once near the root. Toggle with Alt+D. */
export function DataInspector(): React.JSX.Element | null {
  const ctx = useContext(StackbyContext);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ctx?.config.debug) return;
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') setVisible((v) => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ctx?.config.debug]);

  if (!ctx?.config.debug || !visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        background: '#1e1e2e',
        color: '#cdd6f4',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: 12,
        borderRadius: 8,
        maxWidth: 360,
        maxHeight: 400,
        overflow: 'auto',
        zIndex: 9999,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <strong style={{ color: '#89b4fa' }}>Stackby DataInspector</strong>
      <p style={{ margin: '4px 0', color: '#a6e3a1' }}>Stack: {ctx.config.stackId}</p>
      <p style={{ margin: 0, color: '#6c7086', fontSize: 10 }}>
        Alt+D to toggle · Artifact: {ctx.config.artifactId}
      </p>
    </div>
  );
}
