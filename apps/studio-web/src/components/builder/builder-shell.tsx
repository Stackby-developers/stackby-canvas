'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useRunEvents } from '@/src/hooks/use-run-events';
import { RunFeed } from './run-feed';
import { PreviewHost } from './preview-host';
import { FollowUpBar } from './follow-up-bar';
import { PropertiesRail } from './properties-rail';
import { PublishPopover } from './publish-popover';

interface PlanStep {
  id: string;
  type: string;
  title: string;
  tables: string[];
  columns: string[];
}

interface Plan {
  id: string;
  runId: string;
  intent: string;
  artifactType: string;
  stackId: string;
  steps: PlanStep[];
}

interface BuilderShellProps {
  projectId: string;
  runId: string | null;
}

export function BuilderShell({ projectId, runId }: BuilderShellProps) {
  const { events, phase, sendSignal } = useRunEvents(runId);

  const planEvent = [...events].reverse().find((e) => e.type === 'plan');
  const plan = planEvent ? (planEvent.data as unknown as Plan) : null;

  function handleFollowUp(prompt: string) {
    console.warn('Follow-up not yet implemented:', prompt);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Builder sub-header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-bg-elevated px-4">
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <PublishPopover
          projectId={projectId}
          runId={runId}
          plan={plan}
          isReady={phase === 'complete'}
        />
      </div>

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

        {/* Properties rail — right */}
        <PropertiesRail
          projectId={projectId}
          runId={runId}
          events={events}
          phase={phase}
        />
      </div>

      <FollowUpBar phase={phase} onSubmit={handleFollowUp} />
    </div>
  );
}
