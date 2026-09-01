'use client';

import { useState } from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import { Spinner } from '@stackby/ui';
import type { RunEvent, RunPhase } from '@/src/hooks/use-run-events';

const BREAKPOINTS = [
  { label: 'Mobile', width: 375, icon: Smartphone },
  { label: 'Tablet', width: 768, icon: Tablet },
  { label: 'Desktop', width: 1440, icon: Monitor },
] as const;

const PHASE_LABEL: Partial<Record<RunPhase, string>> = {
  connecting: 'Connecting…',
  running: 'Analyzing…',
  awaiting_clarification: 'Waiting for answers…',
  awaiting_plan_approval: 'Waiting for plan approval…',
  building: 'Building…',
  verifying: 'Verifying…',
};

interface PreviewHostProps {
  events: RunEvent[];
  phase: RunPhase;
}

export function PreviewHost({ events, phase }: PreviewHostProps) {
  const [activeWidth, setActiveWidth] = useState<number>(1440);

  const readyEvent = [...events].reverse().find((e) => e.type === 'ready');
  const previewUrl =
    readyEvent && typeof readyEvent.data['previewUrl'] === 'string'
      ? readyEvent.data['previewUrl']
      : null;

  if (!previewUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg-muted">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted">{PHASE_LABEL[phase] ?? 'Working…'}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-bg-muted">
      {/* Breakpoint switcher */}
      <div className="flex items-center justify-center gap-1 border-b border-border bg-bg-elevated px-3 py-1.5">
        {BREAKPOINTS.map((bp) => {
          const Icon = bp.icon;
          const isActive = activeWidth === bp.width;
          return (
            <button
              key={bp.width}
              type="button"
              onClick={() => setActiveWidth(bp.width)}
              title={`${bp.label} (${bp.width}px)`}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-faint hover:bg-bg-muted hover:text-text-muted'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{bp.label}</span>
            </button>
          );
        })}
      </div>

      {/* Preview iframe */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="mx-auto h-full min-h-[600px] overflow-hidden rounded-lg border border-border shadow-sm"
          style={{ width: activeWidth >= 1440 ? '100%' : `${activeWidth}px` }}
        >
          <iframe
            src={previewUrl}
            sandbox="allow-scripts allow-same-origin"
            title="Artifact preview"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
