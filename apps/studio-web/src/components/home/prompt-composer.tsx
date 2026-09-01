'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Textarea, Button, cn } from '@stackby/ui';
import type { ArtifactType } from '@stackby/schema-types';
import { StackPicker } from './stack-picker';
import { ArtifactTypePicker } from './artifact-type-picker';
import { VoiceInputButton } from './voice-input-button';
import { AttachmentZone } from './attachment-zone';

const MAX_CHARS = 4000;
const WARN_AT = 3500;

interface PromptComposerProps {
  recentStacks?: Array<{ id: string; name: string }>;
}

export function PromptComposer({ recentStacks = [] }: PromptComposerProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [stackId, setStackId] = useState('');
  const [artifactType, setArtifactType] = useState<ArtifactType>('dashboard');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = prompt.trim().length > 0 && stackId.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dev-workspace',
          userId: '00000000-0000-0000-0000-000000000001',
          name: prompt.slice(0, 60),
          stackId,
          artifactType,
          prompt,
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status.toString()})`);
      const data = (await res.json()) as { projectId: string; runId: string };
      router.push(`/projects/${data.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-bg-elevated shadow-sm">
      <div className="p-4 pb-2">
        <div className="flex items-start gap-2">
          <Textarea
            className="flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 min-h-[120px]"
            placeholder="Describe what you want to build — e.g. 'A dashboard showing deal pipeline from my CRM stack, with revenue by stage and close-date heatmap'"
            value={prompt}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) setPrompt(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit();
            }}
            disabled={submitting}
          />
          <VoiceInputButton
            onTranscript={(text) => setPrompt((prev) => (prev ? `${prev} ${text}` : text).slice(0, MAX_CHARS))}
            disabled={submitting}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-2">
            <AttachmentZone files={files} onChange={setFiles} />
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 space-y-3">
        <div className="flex items-end gap-3">
          <StackPicker value={stackId} onChange={setStackId} recentStacks={recentStacks} />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Type</span>
            <ArtifactTypePicker value={artifactType} onChange={setArtifactType} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {files.length === 0 && (
              <AttachmentZone files={files} onChange={setFiles} />
            )}
            <span
              className={cn(
                'text-xs tabular-nums',
                prompt.length >= WARN_AT ? 'text-warning' : 'text-text-faint',
              )}
            >
              {prompt.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>

          <Button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            size="md"
            className="gap-2"
          >
            {submitting ? 'Building…' : 'Build'}
            {!submitting && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {error !== null && (
        <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
