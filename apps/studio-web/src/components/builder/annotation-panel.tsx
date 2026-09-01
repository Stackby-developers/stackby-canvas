'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Badge, Textarea } from '@stackby/ui';
import { cn } from '@stackby/ui';
import type { RunPhase } from '@/src/hooks/use-run-events';

interface PlanStep {
  id: string;
  title: string;
}

interface Plan {
  id: string;
  runId: string;
  intent: string;
  artifactType: string;
  stackId: string;
  steps: PlanStep[];
}

interface AnnotationEntry {
  id: string;
  componentId: string;
  comment: string;
  severity: 'critical' | 'minor';
  status: 'pending' | 'applied' | 'needs_input' | 'conflicts_with_plan';
  createdAt: number;
}

interface AnnotationPanelProps {
  plan: Plan | null;
  projectId: string;
  runId: string | null;
  phase: RunPhase;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'outline' as const },
  applied: { label: 'Applied', variant: 'success' as const },
  needs_input: { label: 'Needs input', variant: 'warning' as const },
  conflicts_with_plan: { label: 'Conflicts', variant: 'destructive' as const },
};

export function AnnotationPanel({ plan, projectId, runId, phase }: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<AnnotationEntry[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [comment, setComment] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'minor'>('minor');
  const [submitting, setSubmitting] = useState(false);

  const isReady = phase === 'complete';
  const steps = plan?.steps ?? [];
  const pending = annotations.filter((a) => a.status === 'pending');

  function handleAdd() {
    if (!selectedComponentId || !comment.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: `ann-${Date.now()}`,
        componentId: selectedComponentId,
        comment: comment.trim(),
        severity,
        status: 'pending',
        createdAt: Date.now(),
      },
    ]);
    setComment('');
  }

  async function handleSubmit() {
    if (!pending.length || !runId) return;
    setSubmitting(true);
    const orchestratorUrl =
      process.env['NEXT_PUBLIC_ORCHESTRATOR_URL'] ?? 'http://localhost:3004';
    try {
      await fetch(`${orchestratorUrl}/runs/${runId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stackId: plan?.stackId ?? '',
          artifactId: runId,
          annotations: pending.map((a) => ({
            componentId: a.componentId,
            comment: a.comment,
            severity: a.severity,
          })),
        }),
      });
      setAnnotations((prev) =>
        prev.map((a) => (a.status === 'pending' ? { ...a, status: 'applied' } : a)),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getComponentName(componentId: string): string {
    return steps.find((s) => s.id === componentId)?.title ?? componentId;
  }

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-xs text-text-faint">
          Annotations available once preview is ready.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-auto p-3">
      {/* Add form */}
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          Add annotation
        </p>

        <select
          className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
          value={selectedComponentId}
          onChange={(e) => setSelectedComponentId(e.target.value)}
        >
          <option value="">Select component…</option>
          {steps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>

        <Textarea
          placeholder="Describe the change…"
          className="min-h-[64px] text-xs"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            {(['minor', 'critical'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-medium capitalize transition-colors',
                  severity === s
                    ? s === 'critical'
                      ? 'bg-destructive text-destructive-fg'
                      : 'bg-accent text-accent-fg'
                    : 'text-text-muted hover:bg-bg-muted',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!selectedComponentId || !comment.trim()}
            className="h-7 text-xs"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Submit pending */}
      {pending.length > 0 && (
        <Button
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="text-xs"
        >
          {submitting ? 'Submitting…' : `Submit to agent (${pending.length})`}
        </Button>
      )}

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div className="flex flex-col gap-2">
          {annotations.map((ann) => {
            const statusCfg = STATUS_CONFIG[ann.status];
            return (
              <div
                key={ann.id}
                className="flex flex-col gap-1.5 rounded-md border border-border bg-bg-elevated p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-text-muted">
                      {getComponentName(ann.componentId)}
                    </span>
                    <p className="line-clamp-2 text-xs text-text">{ann.comment}</p>
                  </div>
                  {ann.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() =>
                        setAnnotations((prev) => prev.filter((a) => a.id !== ann.id))
                      }
                      className="shrink-0 rounded p-0.5 text-text-faint hover:text-text"
                      aria-label="Remove annotation"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={ann.severity === 'critical' ? 'destructive' : 'outline'}
                    className="text-[10px]"
                  >
                    {ann.severity}
                  </Badge>
                  <Badge variant={statusCfg.variant} className="text-[10px]">
                    {statusCfg.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {annotations.length === 0 && (
        <p className="text-center text-xs text-text-faint">No annotations yet.</p>
      )}
    </div>
  );
}
