'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Plus, LayoutTemplate, Palette, ChevronDown } from 'lucide-react';
import type { ArtifactType } from '@/src/lib/types';
import { StackPicker } from './stack-picker';
import { VoiceInputButton } from './voice-input-button';
import { AttachmentZone } from './attachment-zone';
import { DEV_WORKSPACE_ID, DEV_USER_ID } from '@/src/lib/dev-constants';

const MAX_CHARS = 4000;

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

  const isApp = artifactType === 'dashboard' || artifactType === 'portal' || artifactType === 'gallery' || artifactType === 'form';
  const isReport = artifactType === 'report';

  return (
    <div>
      <div className="rounded-xl border border-border bg-bg shadow-sm">
        {/* Textarea */}
        <textarea
          className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm text-text placeholder:text-text-faint outline-none min-h-[120px]"
          placeholder="Build me a landing website for my..."
          value={prompt}
          onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setPrompt(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit(); }}
          disabled={submitting}
        />

        {/* Attachment chips */}
        {files.length > 0 && (
          <div className="px-4 pb-2">
            <AttachmentZone files={files} onChange={setFiles} />
          </div>
        )}

        {/* Toolbar row */}
        <div className="flex items-center gap-1 px-3 py-2 border-t border-border">
          {/* Left */}
          <button
            type="button"
            onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.onchange = (e) => { const f = Array.from((e.target as HTMLInputElement).files ?? []); setFiles((prev) => [...prev, ...f].slice(0, 5)); }; input.click(); }}
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-muted hover:text-text transition-colors"
            title="Attach file"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-text-muted hover:bg-bg-muted hover:text-text transition-colors">
            <LayoutTemplate className="h-3.5 w-3.5" /> Templates <ChevronDown className="h-3 w-3" />
          </button>
          <button type="button" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-text-muted hover:bg-bg-muted hover:text-text transition-colors">
            <Palette className="h-3.5 w-3.5" /> Design system <ChevronDown className="h-3 w-3" />
          </button>

          <div className="flex-1" />

          {/* Right */}
          <button
            type="button"
            onClick={() => setArtifactType('dashboard')}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${isApp ? 'bg-bg-muted text-text' : 'text-text-muted hover:bg-bg-muted hover:text-text'}`}
          >
            App
          </button>
          <button
            type="button"
            onClick={() => setArtifactType('report')}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${isReport ? 'bg-bg-muted text-text' : 'text-text-muted hover:bg-bg-muted hover:text-text'}`}
          >
            Report
          </button>
          <VoiceInputButton
            onTranscript={(text) => setPrompt((prev) => (prev ? `${prev} ${text}` : text).slice(0, MAX_CHARS))}
            disabled={submitting}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-text text-bg disabled:opacity-30 transition-opacity hover:opacity-80"
          >
            {submitting
              ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-bg border-t-transparent" />
              : <ArrowUp className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Base selector row */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
          <div className="h-4 w-4 rounded-sm bg-bg-muted border border-border flex items-center justify-center">
            <span className="text-[8px] text-text-muted font-bold leading-none">S</span>
          </div>
          <StackPicker value={stackId} onChange={setStackId} recentStacks={recentStacks} />
        </div>
      </div>

      {error !== null && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
