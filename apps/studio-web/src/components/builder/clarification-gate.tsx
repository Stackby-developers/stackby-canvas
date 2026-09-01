'use client';

import { useState } from 'react';
import { Button, Textarea } from '@stackby/ui';
import type { RunEvent } from '@/src/hooks/use-run-events';

interface ClarificationGateProps {
  events: RunEvent[];
  sendSignal: (signal: string, payload?: Record<string, unknown>) => Promise<void>;
}

export function ClarificationGate({ events, sendSignal }: ClarificationGateProps) {
  const clarifyEvent = [...events].reverse().find((e) => e.type === 'clarification');

  let questions: string[] = [];
  try {
    const raw = clarifyEvent?.data['questions'];
    if (Array.isArray(raw)) {
      questions = raw.filter((q): q is string => typeof q === 'string').slice(0, 3);
    }
  } catch {
    // malformed payload — fall through to empty questions
  }

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q, ''])),
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    await sendSignal('clarifyResponse', { answers });
    setSubmitting(false);
  }

  return (
    <div className="border-t border-border bg-bg-elevated p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-faint">
          Clarification needed
        </p>
        <p className="text-xs text-text-muted">
          Answer the questions below to help the agent build exactly what you need.
        </p>
      </div>

      {questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-xs font-medium text-text">{question}</p>
              <Textarea
                value={answers[question] ?? ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [question]: e.target.value }))
                }
                placeholder="Your answer…"
                rows={2}
                className="text-xs"
              />
            </div>
          ))}
          <Button size="sm" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Sending…' : 'Continue'}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void sendSignal('clarifyResponse', {})}
        >
          Continue without answering
        </Button>
      )}
    </div>
  );
}
