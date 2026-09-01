'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export type RunEventType =
  | 'intent'
  | 'schema_analyzed'
  | 'clarification'
  | 'plan'
  | 'plan_approved'
  | 'codegen'
  | 'build_progress'
  | 'verify'
  | 'fix'
  | 'ready'
  | 'error';

export interface RunEvent {
  id: string;
  type: RunEventType;
  runId: string;
  ts: number;
  data: Record<string, unknown>;
}

export type RunPhase =
  | 'connecting'
  | 'running'
  | 'awaiting_clarification'
  | 'awaiting_plan_approval'
  | 'building'
  | 'verifying'
  | 'complete'
  | 'failed';

interface UseRunEventsResult {
  events: RunEvent[];
  phase: RunPhase;
  sendSignal: (signal: string, payload?: Record<string, unknown>) => Promise<void>;
  reconnect: () => void;
}

export function useRunEvents(runId: string | null): UseRunEventsResult {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [phase, setPhase] = useState<RunPhase>('connecting');
  const cursorRef = useRef('0');
  const esRef = useRef<EventSource | null>(null);

  const orchestratorUrl =
    typeof window !== 'undefined'
      ? (process.env['NEXT_PUBLIC_ORCHESTRATOR_URL'] ?? 'http://localhost:3004')
      : 'http://localhost:3004';

  const connect = useCallback(() => {
    if (!runId) return;
    esRef.current?.close();
    const url = `${orchestratorUrl}/runs/${runId}/events?from=${cursorRef.current}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as RunEvent;
      cursorRef.current = event.id;
      setEvents((prev) => [...prev, event]);

      setPhase(() => {
        switch (event.type) {
          case 'clarification':
            return 'awaiting_clarification';
          case 'plan':
            return 'awaiting_plan_approval';
          case 'plan_approved':
          case 'codegen':
          case 'build_progress':
            return 'building';
          case 'verify':
          case 'fix':
            return 'verifying';
          case 'ready':
            return 'complete';
          case 'error':
            return 'failed';
          default:
            return 'running';
        }
      });

      if (event.type === 'ready' || event.type === 'error') {
        es.close();
      }
    };

    es.onerror = () => {
      setPhase((p) => (p === 'connecting' ? 'failed' : p));
      es.close();
    };
  }, [runId, orchestratorUrl]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);

  const sendSignal = useCallback(
    async (signal: string, payload?: Record<string, unknown>) => {
      if (!runId) return;
      await fetch(`${orchestratorUrl}/runs/${runId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal, payload }),
      });
    },
    [runId, orchestratorUrl],
  );

  return { events, phase, sendSignal, reconnect: connect };
}
