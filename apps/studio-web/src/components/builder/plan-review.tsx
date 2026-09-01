'use client';

import { useState } from 'react';
import { Button, Badge, Textarea } from '@stackby/ui';
import type { RunEvent } from '@/src/hooks/use-run-events';

type StepType = 'component' | 'page' | 'hook' | 'util' | 'api-route' | 'layout';

interface PlanStep {
  id: string;
  type: StepType;
  title: string;
  description: string;
  tables: string[];
  columns: string[];
  dependencies: string[];
  estimatedLines?: number;
}

interface Plan {
  id: string;
  runId: string;
  intent: string;
  artifactType: string;
  stackId: string;
  steps: PlanStep[];
  estimatedDurationMs?: number;
}

const STEP_TYPE_VARIANT: Record<StepType, string> = {
  component: 'bg-accent/15 text-accent',
  page: 'bg-purple-500/15 text-purple-400',
  hook: 'bg-emerald-500/15 text-emerald-400',
  util: 'bg-amber-500/15 text-amber-400',
  'api-route': 'bg-rose-500/15 text-rose-400',
  layout: 'bg-bg-muted text-text-muted',
};

function formatDuration(ms: number | undefined): string | null {
  if (ms === undefined) return null;
  const mins = Math.round(ms / 60_000);
  return mins < 1 ? '< 1m' : `~${mins}m`;
}

interface PlanReviewProps {
  events: RunEvent[];
  sendSignal: (signal: string, payload?: Record<string, unknown>) => Promise<void>;
}

export function PlanReview({ events, sendSignal }: PlanReviewProps) {
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const planEvent = [...events].reverse().find((e) => e.type === 'plan');

  let plan: Plan | null = null;
  let parseError = false;
  try {
    if (planEvent) {
      const d = planEvent.data;
      plan = d as unknown as Plan;
      if (!plan.steps || !Array.isArray(plan.steps)) throw new Error('invalid');
    }
  } catch {
    parseError = true;
  }

  async function approve() {
    setSubmitting(true);
    await sendSignal('approvePlan');
    setSubmitting(false);
  }

  async function reject() {
    setSubmitting(true);
    await sendSignal('rejectPlan', { feedback });
    setSubmitting(false);
    setRejecting(false);
    setFeedback('');
  }

  const duration = plan?.estimatedDurationMs !== undefined
    ? formatDuration(plan.estimatedDurationMs)
    : null;

  return (
    <div className="border-t border-border bg-bg-elevated">
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-faint">
            Plan Review
          </p>
          {plan && (
            <p className="text-xs text-text-muted line-clamp-2">{plan.intent}</p>
          )}
        </div>

        {parseError && (
          <p className="text-xs text-text-muted italic">Plan details unavailable</p>
        )}

        {plan && !parseError && (
          <div className="space-y-2">
            <p className="text-[11px] text-text-faint">
              {plan.steps.length} step{plan.steps.length !== 1 ? 's' : ''}
              {duration ? ` · ${duration} estimated` : ''}
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {plan.steps.map((step) => (
                <div key={step.id} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${STEP_TYPE_VARIANT[step.type] ?? 'bg-bg-muted text-text-muted'}`}
                    >
                      {step.type}
                    </span>
                    <span className="text-xs font-medium text-text">{step.title}</span>
                  </div>
                  {(step.tables.length > 0 || step.columns.length > 0) && (
                    <p className="text-[11px] text-text-faint pl-1">
                      {step.tables.length > 0 && `Tables: ${step.tables.join(', ')}`}
                      {step.tables.length > 0 && step.columns.length > 0 && ' · '}
                      {step.columns.length > 0 && `Cols: ${step.columns.join(', ')}`}
                      {step.estimatedLines !== undefined && ` · ~${step.estimatedLines} lines`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {rejecting && (
          <div className="space-y-2">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What should be changed?"
              rows={2}
              className="text-xs"
            />
          </div>
        )}

        <div className="flex gap-2">
          {rejecting ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setRejecting(false); setFeedback(''); }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void reject()}
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejecting(true)}
                disabled={submitting}
              >
                Reject
              </Button>
              <Button size="sm" onClick={() => void approve()} disabled={submitting}>
                {submitting ? 'Approving…' : 'Approve Plan →'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
