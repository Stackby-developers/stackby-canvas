'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Plus, Loader2, Check, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button, Input, Badge, Spinner,
} from '@stackby/ui';
import type { Template } from '@/src/lib/templates';
import { DEV_WORKSPACE_ID, DEV_USER_ID } from '@/src/lib/dev-constants';

interface FieldMapping {
  template_entity: string;
  template_field: string;
  role: string;
  matched_table_id: string;
  matched_column_id: string;
  confidence: number;
  basis: string;
}

interface UnmappedRequired {
  template_field: string;
  suggestion: 'create_column' | 'ask_user';
  proposed_column: { name: string; columnType: string } | null;
}

interface RemapQuestion {
  id: string;
  question: string;
  options: string[];
}

interface TemplateRemapOutput {
  mappings: FieldMapping[];
  unmapped_required: UnmappedRequired[];
  questions: RemapQuestion[];
}

type MappingStep = 'stack_input' | 'mapping';

interface StackMappingDialogProps {
  template: Template;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function StackMappingDialog({ template, open, onOpenChange }: StackMappingDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<MappingStep>('stack_input');
  const [stackId, setStackId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [remapOutput, setRemapOutput] = useState<TemplateRemapOutput | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose(o: boolean) {
    if (!o) {
      setStep('stack_input');
      setStackId('');
      setRemapOutput(null);
      setConfirmed({});
      setQuestionAnswers({});
      setError(null);
    }
    onOpenChange(o);
  }

  async function handleAnalyze() {
    if (!stackId.trim() || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const templateFields = template.schema.flatMap((entity) =>
        entity.fields.map((f) => ({
          entity: entity.name,
          field: f.name,
          role: f.role,
          required: f.required,
          columnType: f.columnType,
        })),
      );
      const res = await fetch(`/api/templates/${template.id}/remap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stackId: stackId.trim(), templateFields }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = (await res.json()) as TemplateRemapOutput;
      setRemapOutput(data);
      setStep('mapping');
    } catch {
      setError('Could not analyze stack. Check the Stack ID and try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleStartBuilding() {
    if (!stackId.trim() || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: DEV_WORKSPACE_ID,
          userId: DEV_USER_ID,
          name: template.name,
          stackId: stackId.trim(),
          artifactType: template.type,
          prompt: template.prompt,
        }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const { projectId, runId } = (await res.json()) as { projectId: string; runId: string };
      handleClose(false);
      router.push(`/projects/${projectId}?runId=${runId}`);
    } catch {
      setError('Failed to start building. Please try again.');
      setStarting(false);
    }
  }

  const probabilisticMappings = remapOutput?.mappings.filter(
    (m) => m.confidence >= 0.7 && m.confidence < 0.9,
  ) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {step === 'stack_input' && (
          <>
            <DialogHeader>
              <DialogTitle>Use {template.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-text-muted">{template.longDescription}</p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text">Stack ID</label>
                <Input
                  value={stackId}
                  onChange={(e) => setStackId(e.target.value)}
                  placeholder="Paste your Stackby base ID"
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAnalyze(); }}
                  autoFocus
                />
                <p className="text-[11px] text-text-faint">Find it in your Stackby workspace URL</p>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={() => void handleAnalyze()} disabled={!stackId.trim() || analyzing}>
                {analyzing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                {analyzing ? 'Analyzing…' : 'Analyze stack →'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'mapping' && remapOutput && (
          <>
            <DialogHeader>
              <DialogTitle>Field mapping</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 space-y-4 overflow-y-auto py-2">
              <p className="text-xs text-text-muted">Review how your stack matches the template fields.</p>

              {/* Auto-mapped (≥0.9) */}
              {remapOutput.mappings.filter((m) => m.confidence >= 0.9).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-faint">Auto-mapped</p>
                  {remapOutput.mappings
                    .filter((m) => m.confidence >= 0.9)
                    .map((m) => (
                      <div key={`${m.template_entity}-${m.template_field}`} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        <span className="text-sm text-text">{m.template_field}</span>
                        <span className="text-xs text-text-faint">→ {m.matched_column_id}</span>
                        <Badge variant="success" className="ml-auto text-[10px]">Auto-mapped</Badge>
                      </div>
                    ))}
                </div>
              )}

              {/* Confirm? (0.7–0.89) */}
              {probabilisticMappings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-faint">Confirm matches</p>
                  {probabilisticMappings.map((m) => {
                    const key = `${m.template_entity}-${m.template_field}`;
                    const isConfirmed = confirmed[key];
                    const isRejected = confirmed[key] === false;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        {isRejected
                          ? <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                          : isConfirmed
                          ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          : <div className="h-4 w-4 shrink-0 rounded-full border border-border" />
                        }
                        <span className="text-sm text-text">{m.template_field}</span>
                        <span className="text-xs text-text-faint">→ {m.matched_column_id}</span>
                        <div className="ml-auto flex gap-1">
                          <button
                            type="button"
                            onClick={() => setConfirmed((p) => ({ ...p, [key]: true }))}
                            className="rounded p-0.5 hover:bg-success/15 text-text-faint hover:text-success"
                            aria-label="Confirm"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmed((p) => ({ ...p, [key]: false }))}
                            className="rounded p-0.5 hover:bg-destructive/15 text-text-faint hover:text-destructive"
                            aria-label="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Questions */}
              {remapOutput.questions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-faint">Clarifications needed</p>
                  {remapOutput.questions.map((q) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-xs font-medium text-text">{q.question}</label>
                      <select
                        value={questionAnswers[q.id] ?? ''}
                        onChange={(e) => setQuestionAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="">Select an option…</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Unmapped required */}
              {remapOutput.unmapped_required.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-faint">Will be created</p>
                  {remapOutput.unmapped_required.map((u) => (
                    <div key={u.template_field} className="flex items-center gap-2">
                      {u.suggestion === 'create_column' && u.proposed_column ? (
                        <>
                          <Plus className="h-3.5 w-3.5 shrink-0 text-accent" />
                          <span className="text-xs text-text-muted">
                            New column: <strong className="text-text">{u.proposed_column.name}</strong>{' '}
                            <span className="text-text-faint">({u.proposed_column.columnType})</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-warning" />
                          <span className="text-xs text-text-muted">Unmapped: {u.template_field}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('stack_input')}>Back</Button>
              <Button onClick={() => void handleStartBuilding()} disabled={starting}>
                {starting ? <Spinner size="sm" className="mr-1.5" /> : null}
                Start building →
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
