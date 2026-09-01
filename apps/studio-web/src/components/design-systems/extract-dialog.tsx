'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button, Input,
} from '@stackby/ui';

interface ExtractDialogProps {
  designSystemId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: () => void;
}

interface ProgressStep {
  step: string;
  message?: string;
}

type ExtractStep = 'url' | 'progress' | 'done';

export function ExtractDialog({ designSystemId, open, onOpenChange, onComplete }: ExtractDialogProps) {
  const [step, setStep] = useState<ExtractStep>('url');
  const [url, setUrl] = useState('');
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);

  const DESIGN_URL = process.env['NEXT_PUBLIC_DESIGN_URL'] ?? 'http://localhost:3007';

  async function handleExtract() {
    if (!url.trim()) return;
    setStarting(true);

    await fetch(`/api/design-systems/${designSystemId}/extract`, { method: 'POST' });

    setStep('progress');
    setStarting(false);

    const es = new EventSource(`${DESIGN_URL}/design-systems/${designSystemId}/events`);
    es.onmessage = (e: MessageEvent<string>) => {
      const progress = JSON.parse(e.data) as ProgressStep;
      setSteps((prev) => [...prev, progress]);
      if (['complete', 'failed', 'cancelled'].includes(progress.step)) {
        es.close();
        if (progress.step === 'complete') {
          setStep('done');
          onComplete();
        } else {
          setFailed(true);
        }
      }
    };
    es.onerror = () => {
      es.close();
      setFailed(true);
    };
  }

  function handleClose(o: boolean) {
    if (!o) {
      setStep('url');
      setUrl('');
      setSteps([]);
      setFailed(false);
    }
    onOpenChange(o);
  }

  const terminalSteps = new Set(['complete', 'failed', 'cancelled']);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extract from URL</DialogTitle>
          <DialogDescription>
            Studio will crawl your brand URL and extract design tokens automatically.
          </DialogDescription>
        </DialogHeader>

        {step === 'url' && (
          <div className="space-y-4 pt-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-brand.com"
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={() => void handleExtract()} disabled={!url.trim() || starting}>
                {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Extract
              </Button>
            </div>
          </div>
        )}

        {step === 'progress' && (
          <div className="space-y-2 pt-2">
            {steps.map((s, i) => {
              const isDone = terminalSteps.has(s.step) || i < steps.length - 1;
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-muted" />
                  )}
                  <span className={isDone ? 'text-text' : 'text-text-muted'}>{s.step}</span>
                  {s.message && <span className="text-xs text-text-faint">{s.message}</span>}
                </div>
              );
            })}
            {steps.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting extraction…
              </div>
            )}
            {failed && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                Extraction failed. Close and try again.
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Tokens extracted successfully.
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
