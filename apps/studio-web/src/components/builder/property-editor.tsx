'use client';

import { useState } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { Button, Badge } from '@stackby/ui';
import { useUndoRedo } from '@/src/hooks/use-undo-redo';
import type { RunPhase } from '@/src/hooks/use-run-events';

interface PlanStep {
  id: string;
  type: string;
  title: string;
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

interface PatchRecord {
  componentId: string;
  property: string;
  oldValue: string;
  newValue: string;
}

interface PropertyEditorProps {
  plan: Plan | null;
  projectId: string;
  runId: string | null;
  phase: RunPhase;
}

const STUDIO_TOKENS: Record<string, string> = {
  '--color-bg': 'hsl(0 0% 100%)',
  '--color-bg-elevated': 'hsl(240 5% 96%)',
  '--color-bg-muted': 'hsl(240 4.8% 93.9%)',
  '--color-border': 'hsl(240 5.9% 90%)',
  '--color-text': 'hsl(240 10% 3.9%)',
  '--color-text-muted': 'hsl(240 3.8% 46.1%)',
  '--color-accent': 'hsl(239 84% 67%)',
  '--color-success': 'hsl(142 71% 45%)',
  '--color-warning': 'hsl(38 92% 50%)',
  '--color-destructive': 'hsl(0 84% 60%)',
};

const PROPERTIES = [
  'color', 'background', 'border-color', 'font-size',
  'padding', 'border-radius', 'gap', 'opacity',
];

function findSnapToken(val: string): string | null {
  if (val.startsWith('--')) {
    return Object.keys(STUDIO_TOKENS).find((k) => k === val) ?? null;
  }
  const match = Object.entries(STUDIO_TOKENS).find(([, v]) => v === val);
  return match ? match[0] : null;
}

export function PropertyEditor({ plan, projectId, runId, phase }: PropertyEditorProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [property, setProperty] = useState('color');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    tokenUsed: string | null;
    explanation: string;
  } | null>(null);

  const { undo, redo, canUndo, canRedo, set: pushPatch } = useUndoRedo<PatchRecord | null>(null);

  const isEditable = phase === 'complete' || phase === 'verifying';
  const snapToken = findSnapToken(value);

  async function handleApply() {
    if (!selectedStepId || !value.trim() || !runId) return;
    setSubmitting(true);
    const orchestratorUrl =
      process.env['NEXT_PUBLIC_ORCHESTRATOR_URL'] ?? 'http://localhost:3004';
    const patch: PatchRecord = {
      componentId: selectedStepId,
      property,
      oldValue: '',
      newValue: value,
    };
    pushPatch(patch);
    try {
      await fetch(`${orchestratorUrl}/runs/${runId}/visual-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stackId: plan?.stackId ?? '',
          artifactId: runId,
          patch: { componentId: selectedStepId, property, value },
          affectsLayout: ['padding', 'gap', 'border-radius'].includes(property),
        }),
      });
      setResult({ tokenUsed: snapToken, explanation: 'Patch queued.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!isEditable) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-xs text-text-faint">
          Visual editing available once preview is ready.
        </p>
      </div>
    );
  }

  const steps = plan?.steps ?? [];

  return (
    <div className="flex flex-col gap-3 overflow-auto p-3">
      {/* Component selector */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          Component
        </label>
        <select
          className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
          value={selectedStepId ?? ''}
          onChange={(e) => setSelectedStepId(e.target.value || null)}
        >
          <option value="">Select component…</option>
          {steps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Property + value */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          Property
        </label>
        <select
          className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
          value={property}
          onChange={(e) => setProperty(e.target.value)}
        >
          {PROPERTIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          Value
        </label>
        <input
          className="h-8 w-full rounded-md border border-border bg-transparent px-2 font-mono text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="e.g. --color-accent"
          value={value}
          onChange={(e) => { setValue(e.target.value); setResult(null); }}
        />
        {snapToken && (
          <button
            type="button"
            onClick={() => setValue(snapToken)}
            className="self-start rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] text-accent hover:bg-accent/20"
          >
            → Snap to {snapToken}
          </button>
        )}
      </div>

      {/* Token result */}
      {result && (
        <div className="rounded-md border border-border bg-bg-muted p-2">
          {result.tokenUsed && (
            <p className="text-[10px] text-text-muted">
              Token used: <span className="font-mono text-accent">{result.tokenUsed}</span>
            </p>
          )}
          <p className="text-[10px] text-text-faint">{result.explanation}</p>
        </div>
      )}

      {/* Undo / Redo / Apply */}
      <div className="flex items-center gap-1 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          className="h-7 w-7"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
          className="h-7 w-7"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={() => void handleApply()}
          disabled={!selectedStepId || !value.trim() || submitting}
          className="h-7 text-xs"
        >
          {submitting ? 'Applying…' : 'Apply'}
        </Button>
      </div>

      {/* Patch history hint */}
      {canUndo && (
        <Badge variant="outline" className="self-start text-[10px]">
          {`History: ${canUndo ? 'can undo' : ''}`}
        </Badge>
      )}
    </div>
  );
}
