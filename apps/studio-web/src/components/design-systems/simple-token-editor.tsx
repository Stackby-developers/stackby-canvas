'use client';

import { Trash2, Plus } from 'lucide-react';
import { Button, Input } from '@stackby/ui';

interface SimpleTokenEditorProps {
  label: string;
  tokens: Record<string, string>;
  onChange: (tokens: Record<string, string>) => void;
  placeholder?: string;
}

export function SimpleTokenEditor({ label, tokens, onChange, placeholder }: SimpleTokenEditorProps) {
  const entries = Object.entries(tokens);

  function updateKey(oldKey: string, newKey: string) {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(tokens)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  }

  function updateValue(key: string, value: string) {
    onChange({ ...tokens, [key]: value });
  }

  function remove(key: string) {
    const next = { ...tokens };
    delete next[key];
    onChange(next);
  }

  function add() {
    const key = `token-${Date.now()}`;
    onChange({ ...tokens, [key]: '' });
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <Input
            value={key}
            onChange={(e) => updateKey(key, e.target.value)}
            className="h-7 w-32 text-xs font-mono"
            placeholder="name"
          />
          <Input
            value={value}
            onChange={(e) => updateValue(key, e.target.value)}
            className="h-7 flex-1 text-xs font-mono"
            placeholder={placeholder ?? 'value'}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-text-faint hover:text-destructive"
            onClick={() => remove(key)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={add}>
        <Plus className="mr-1 h-3 w-3" />
        Add {label}
      </Button>
    </div>
  );
}
