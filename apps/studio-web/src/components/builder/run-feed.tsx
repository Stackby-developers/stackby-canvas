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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Spinner size="md" />
        <p style={{ fontSize: '13px', color: '#8A8A8A' }}>Connecting…</p>
      </div>
    );
  }

  if (phase === 'failed' && events.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>Connection failed</p>
        <p style={{ fontSize: '13px', color: '#8A8A8A' }}>Check that the orchestrator service is running, then reload.</p>
      </div>
    );
  }

  const now = new Date();
  const timestamp = `${now.getDate()} ${now.toLocaleString('en', { month: 'short' })}, ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 0' }}>
        {/* Timestamp separator */}
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#8A8A8A', marginTop: '6px', marginBottom: '16px' }}>{timestamp}</p>

        {/* Event stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((event, i) => (
            <RunCard key={event.id} event={event} isLatest={i === events.length - 1} />
          ))}
        </div>

        <div ref={bottomRef} style={{ height: '16px' }} />
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
