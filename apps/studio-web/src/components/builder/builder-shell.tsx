'use client';

import { useRunEvents } from '@/src/hooks/use-run-events';
import { RunFeed } from './run-feed';
import { PreviewHost } from './preview-host';
import { FollowUpBar } from './follow-up-bar';

interface BuilderShellProps {
  projectId: string;
  runId: string | null;
}

export function BuilderShell({ projectId: _projectId, runId }: BuilderShellProps) {
  const { events, phase, sendSignal } = useRunEvents(runId);

  function handleFollowUp(prompt: string) {
    console.warn('Follow-up not yet implemented:', prompt);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Run feed — left panel */}
        <div className="w-60 shrink-0 border-r border-border bg-bg-elevated overflow-hidden flex flex-col">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-semibold text-text-muted">Run</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <RunFeed events={events} phase={phase} sendSignal={sendSignal} />
          </div>
        </div>

        {/* Preview — center */}
        <div className="flex-1 overflow-hidden">
          <PreviewHost events={events} phase={phase} />
        </div>

        {/* Properties rail — right (Phase 5) */}
        <div className="w-80 shrink-0 border-l border-border bg-bg-elevated flex items-center justify-center">
          <p className="text-xs text-text-faint">Visual Edit — Phase 5</p>
        </div>
      </div>

      <FollowUpBar phase={phase} onSubmit={handleFollowUp} />
    </div>
  );
}
