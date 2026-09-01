'use client';

import { BarChart2, Layout, FileText, ClipboardList, Grid } from 'lucide-react';
import { cn } from '@stackby/ui';
import type { ArtifactType } from '@stackby/schema-types';

const TYPES: Array<{ value: ArtifactType; label: string; Icon: React.ElementType }> = [
  { value: 'dashboard', label: 'Dashboard', Icon: BarChart2 },
  { value: 'portal', label: 'Portal', Icon: Layout },
  { value: 'report', label: 'Report', Icon: FileText },
  { value: 'form', label: 'Form', Icon: ClipboardList },
  { value: 'gallery', label: 'Gallery', Icon: Grid },
];

interface ArtifactTypePickerProps {
  value: ArtifactType | null;
  onChange: (t: ArtifactType) => void;
}

export function ArtifactTypePicker({ value, onChange }: ArtifactTypePickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Artifact type">
      {TYPES.map(({ value: t, label, Icon }) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            value === t
              ? 'border-accent/40 bg-accent/15 text-accent'
              : 'border-border bg-transparent text-text-muted hover:border-border hover:bg-bg-muted hover:text-text',
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
        </button>
      ))}
    </div>
  );
}
