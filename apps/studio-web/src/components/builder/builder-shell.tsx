'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Database, RotateCcw, Monitor, Code2, MessageSquare } from 'lucide-react';
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

type BuilderView = 'preview' | 'code';

interface BuilderShellProps {
  projectId: string;
  runId: string | null;
}

export function BuilderShell({ projectId, runId }: BuilderShellProps) {
  const { events, phase, sendSignal } = useRunEvents(runId);
  const [view, setView] = useState<BuilderView>('preview');
  const [showRail, setShowRail] = useState(false);

  const planEvent = [...events].reverse().find((e) => e.type === 'plan');
  const plan = planEvent ? (planEvent.data as unknown as Plan) : null;
  const stackId = plan?.stackId ?? '';

  function handleFollowUp(p: string) {
    console.warn('Follow-up not yet implemented:', p);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      {/* Canvas-style top header */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-bg px-3">
        {/* Left */}
        <Link
          href="/"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text"
        >
          <span className="text-[10px] font-bold text-bg">S</span>
        </Link>

        <button className="flex max-w-[200px] items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-text hover:bg-bg-muted transition-colors">
          <span className="truncate">Project</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        </button>

        <span className="rounded border border-border px-1.5 py-0.5 text-xs text-text-muted">
          App
        </span>

        <button
          onClick={() => setShowRail((o) => !o)}
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-muted hover:text-text transition-colors"
          title="Toggle properties panel"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        {/* Center: base pill */}
        <div className="flex flex-1 justify-center">
          {stackId ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-sm">
              <Database className="h-3.5 w-3.5 text-success" />
              <span className="max-w-[160px] truncate font-medium text-text">{stackId}</span>
              <button className="text-text-muted hover:text-text transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setView('preview')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${view === 'preview' ? 'bg-bg-muted text-text' : 'text-text-muted hover:text-text'}`}
            >
              <Monitor className="h-3.5 w-3.5" /> Preview <ChevronDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => setView('code')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${view === 'code' ? 'bg-bg-muted text-text' : 'text-text-muted hover:text-text'}`}
            >
              <Code2 className="h-3.5 w-3.5" /> Edit
            </button>
            <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text transition-colors">
              <MessageSquare className="h-3.5 w-3.5" /> Annotate
            </button>
          </div>

          <PublishPopover
            projectId={projectId}
            runId={runId}
            plan={plan}
            isReady={phase === 'complete'}
          />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: conversation */}
        <div className="flex w-[430px] shrink-0 flex-col overflow-hidden border-r border-border bg-bg">
          <RunFeed events={events} phase={phase} sendSignal={sendSignal} />
          <FollowUpBar phase={phase} onSubmit={handleFollowUp} />
        </div>

        {/* Center: preview */}
        <div className="flex-1 overflow-hidden bg-bg-muted">
          <PreviewHost events={events} phase={phase} />
        </div>

        {/* Right rail (toggle) */}
        {showRail && (
          <PropertiesRail projectId={projectId} runId={runId} events={events} phase={phase} />
        )}
      </div>
    </div>
  );
}
