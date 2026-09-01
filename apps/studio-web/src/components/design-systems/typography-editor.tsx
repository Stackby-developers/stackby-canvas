'use client';

import { Input } from '@stackby/ui';
import { SimpleTokenEditor } from './simple-token-editor';
import type { DesignTokens } from '@/src/lib/design-system-types';

interface TypographyEditorProps {
  typography: DesignTokens['typography'];
  onChange: (t: DesignTokens['typography']) => void;
}

export function TypographyEditor({ typography, onChange }: TypographyEditorProps) {
  const t = typography ?? {};

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-muted">Font family</p>
        <Input
          value={t.fontFamily ?? ''}
          onChange={(e) => {
            const next: DesignTokens['typography'] = { ...t };
            if (e.target.value) next.fontFamily = e.target.value;
            else delete next.fontFamily;
            onChange(next);
          }}
          placeholder="Inter, system-ui, sans-serif"
          className="h-8 text-xs font-mono max-w-sm"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-muted">Font sizes</p>
        <SimpleTokenEditor
          label="size"
          tokens={t.fontSize ?? {}}
          onChange={(v) => {
            const next: DesignTokens['typography'] = { ...t };
            if (Object.keys(v).length) next.fontSize = v;
            else delete next.fontSize;
            onChange(next);
          }}
          placeholder="0.875rem"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-muted">Font weights</p>
        <SimpleTokenEditor
          label="weight"
          tokens={Object.fromEntries(
            Object.entries(t.fontWeight ?? {}).map(([k, v]) => [k, String(v)]),
          )}
          onChange={(v) => {
            const next: DesignTokens['typography'] = { ...t };
            if (Object.keys(v).length) {
              next.fontWeight = v;
            } else {
              delete next.fontWeight;
            }
            onChange(next);
          }}
          placeholder="400"
        />
      </div>
    </div>
  );
}
