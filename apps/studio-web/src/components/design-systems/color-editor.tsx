'use client';

import { Trash2, Plus } from 'lucide-react';
import { Button, Input } from '@stackby/ui';
import { WcagBadge } from './wcag-badge';
import { getContrastRatio, isValidHex } from '@/src/lib/wcag';

interface ColorEditorProps {
  colors: Record<string, string>;
  onChange: (colors: Record<string, string>) => void;
}

export function ColorEditor({ colors, onChange }: ColorEditorProps) {
  const entries = Object.entries(colors);

  function updateKey(oldKey: string, newKey: string) {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(colors)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  }

  function updateValue(key: string, value: string) {
    onChange({ ...colors, [key]: value });
  }

  function remove(key: string) {
    const next = { ...colors };
    delete next[key];
    onChange(next);
  }

  function add() {
    onChange({ ...colors, [`color-${Date.now()}`]: '#6366f1' });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[2rem_1fr_7rem_auto_auto_2rem] items-center gap-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-faint">
        <span />
        <span>Name</span>
        <span>Value</span>
        <span>vs white</span>
        <span>vs black</span>
        <span />
      </div>

      {entries.map(([key, value]) => {
        const valid = isValidHex(value);
        const vsWhite = valid ? getContrastRatio(value, '#ffffff') : 0;
        const vsBlack = valid ? getContrastRatio(value, '#000000') : 0;

        return (
          <div key={key} className="grid grid-cols-[2rem_1fr_7rem_auto_auto_2rem] items-center gap-2">
            <div
              className="h-8 w-8 rounded-md border border-border"
              style={{ backgroundColor: valid ? value : undefined }}
            />
            <Input
              value={key}
              onChange={(e) => updateKey(key, e.target.value)}
              className="h-7 text-xs font-mono"
            />
            <Input
              value={value}
              onChange={(e) => updateValue(key, e.target.value)}
              className={`h-7 text-xs font-mono ${!valid && value ? 'border-destructive' : ''}`}
              placeholder="#000000"
            />
            <span>{valid ? <WcagBadge ratio={vsWhite} /> : <span className="text-xs text-text-faint">—</span>}</span>
            <span>{valid ? <WcagBadge ratio={vsBlack} /> : <span className="text-xs text-text-faint">—</span>}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-text-faint hover:text-destructive"
              onClick={() => remove(key)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}

      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={add}>
        <Plus className="mr-1 h-3 w-3" />
        Add color
      </Button>
    </div>
  );
}
