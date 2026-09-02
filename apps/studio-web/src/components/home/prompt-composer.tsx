'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Plus, LayoutTemplate, Palette, ChevronDown } from 'lucide-react';
import type { ArtifactType } from '@/src/lib/types';
import { StackPicker } from './stack-picker';
import { VoiceInputButton } from './voice-input-button';
import { DEV_WORKSPACE_ID, DEV_USER_ID } from '@/src/lib/dev-constants';
import { useTypewriter } from '@/src/hooks/use-typewriter';

const MAX_CHARS = 4000;

interface PromptComposerProps {
  recentStacks?: Array<{ id: string; name: string }>;
}

export function PromptComposer({ recentStacks = [] }: PromptComposerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typewriterText = useTypewriter();
  const [prompt, setPrompt] = useState('');
  const [stackId, setStackId] = useState('');
  const [artifactType, setArtifactType] = useState<ArtifactType>('dashboard');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = prompt.trim().length > 0 && stackId.trim().length > 0 && !submitting;
  const isReport = artifactType === 'report';

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: DEV_WORKSPACE_ID,
          userId: DEV_USER_ID,
          name: prompt.slice(0, 60),
          stackId,
          artifactType,
          prompt,
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status.toString()})`);
      const data = (await res.json()) as { projectId: string; runId: string };
      router.push(`/projects/${data.projectId}?runId=${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div
        className="rounded-2xl border border-border bg-bg overflow-hidden"
        style={{ boxShadow: '0 0 1px rgba(0,0,0,.48), 0 0 2px rgba(0,0,0,.64), 0 8px 24px rgba(0,0,0,.32)' }}
      >
        {/* Textarea */}
        <textarea
          value={prompt}
          onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setPrompt(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit(); }}
          placeholder={prompt.length === 0 ? typewriterText : ''}
          disabled={submitting}
          rows={3}
          className="block w-full resize-none bg-transparent px-5 pt-5 pb-3 text-[15px] text-text placeholder:text-text-faint outline-none min-h-[72px]"
        />

        {/* Attachment chips */}
        {files.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded-full border border-border-active bg-surface px-2.5 py-1 text-[13px] text-text-muted"
              >
                <span className="truncate max-w-[120px]">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="ml-1 text-text-faint hover:text-text-muted transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Control row */}
        <div className="flex items-center gap-1 px-3 pb-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-text-muted hover:bg-hover hover:text-text-secondary transition-colors duration-150"
          >
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.csv,.pdf"
            onChange={(e) => {
              if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 5));
            }}
          />

          <button
            type="button"
            onClick={() => setArtifactType(isReport ? 'dashboard' : 'report')}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 text-[15px] text-text-muted hover:bg-hover hover:text-text-secondary transition-colors duration-150"
          >
            <LayoutTemplate strokeWidth={1.5} className="h-3.5 w-3.5" />
            {isReport ? 'Report' : 'App'}
            <ChevronDown strokeWidth={1.5} className="h-3 w-3" />
          </button>

          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 text-[15px] text-text-muted hover:bg-hover hover:text-text-secondary transition-colors duration-150"
          >
            <Palette strokeWidth={1.5} className="h-3.5 w-3.5" />
            Design system
            <ChevronDown strokeWidth={1.5} className="h-3 w-3" />
          </button>

          <div className="flex-1" />

          <VoiceInputButton
            onTranscript={(text) => setPrompt((prev) => (prev ? `${prev} ${text}` : text).slice(0, MAX_CHARS))}
            disabled={submitting}
          />

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className={[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150',
              canSubmit ? 'bg-text text-bg hover:opacity-80' : 'bg-border-active text-text-faint',
            ].join(' ')}
          >
            {submitting
              ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              : <ArrowUp strokeWidth={2} className="h-4 w-4" />}
          </button>
        </div>

        {/* Base selector footer */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 bg-hover">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-border-active">
            <span className="text-[8px] font-bold text-text-faint leading-none">S</span>
          </div>
          <StackPicker value={stackId} onChange={setStackId} recentStacks={recentStacks} />
        </div>
      </div>

      {error !== null && (
        <p className="mt-2 text-[13px] text-destructive">{error}</p>
      )}
    </div>
  );
}
