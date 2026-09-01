'use client';

import { useEffect, useRef } from 'react';
import { Spinner } from '@stackby/ui';
import { RunCard } from './run-card';
import { ClarificationGate } from './clarification-gate';
import { PlanReview } from './plan-review';
import type { RunEvent, RunPhase } from '@/src/hooks/use-run-events';

interface RunFeedProps {
  events: RunEvent[];
  phase: RunPhase;
  sendSignal: (signal: string, payload?: Record<string, unknown>) => Promise<void>;
}

export function RunFeed({ events, phase, sendSignal }: RunFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  if (phase === 'connecting' && events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Spinner size="md" />
        <p className="text-xs text-text-muted">Connecting…</p>
      </div>
    );
  }

  if (phase === 'failed' && events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-xs font-medium text-destructive">Connection failed</p>
        <p className="text-xs text-text-faint">
          Check that the orchestrator service is running, then reload.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto py-2">
        <div className="divide-y divide-border/50">
          {events.map((event, i) => (
            <RunCard key={event.id} event={event} isLatest={i === events.length - 1} />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {phase === 'awaiting_clarification' && (
        <ClarificationGate events={events} sendSignal={sendSignal} />
      )}
      {phase === 'awaiting_plan_approval' && (
        <PlanReview events={events} sendSignal={sendSignal} />
      )}
    </div>
  );
}
