'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Plus, LayoutTemplate, Palette, ChevronDown, Database } from 'lucide-react';
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
  const hasText = prompt.trim().length > 0;

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
      {/* Composer container */}
      <div style={{
        background: '#1C1C1C',
        border: '1px solid #2E2E2E',
        borderRadius: '16px',
        boxShadow: '0 0 1px rgba(0,0,0,.48),0 0 2px rgba(0,0,0,.64),0 8px 24px rgba(0,0,0,.32)',
      }}>
        {/* Textarea */}
        <textarea
          value={prompt}
          onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setPrompt(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit(); }}
          placeholder={prompt.length === 0 ? typewriterText : ''}
          disabled={submitting}
          rows={3}
          style={{
            display: 'block',
            width: '100%',
            resize: 'none',
            background: 'transparent',
            padding: '20px 20px 0',
            fontSize: '15px',
            color: '#fff',
            outline: 'none',
            minHeight: '52px',
            border: 'none',
            fontFamily: 'inherit',
          }}
          className="placeholder:text-[#6B6B6B]"
        />

        {/* Attachment chips */}
        {files.length > 0 && (
          <div style={{ padding: '8px 16px 0', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {files.map((f, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '999px', border: '1px solid #3A3A3A', background: '#282828', padding: '4px 10px', fontSize: '13px', color: '#EDEDED' }}
              >
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} style={{ color: '#8A8A8A', marginLeft: '4px' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Control row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px 16px' }}>
          {/* + button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #363636', background: '#232323', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}
          >
            <Plus strokeWidth={1.6} style={{ width: '16px', height: '16px', color: '#8A8A8A' }} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            multiple
            accept="image/*,.csv,.pdf"
            onChange={(e) => {
              if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 5));
            }}
          />

          {/* Report chip */}
          <button
            type="button"
            onClick={() => setArtifactType(isReport ? 'dashboard' : 'report')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              height: '36px', padding: '0 12px', borderRadius: '999px',
              background: '#242424',
              border: `1px solid ${isReport ? '#4A4A4A' : '#363636'}`,
              fontSize: '15px', color: isReport ? '#fff' : '#EDEDED',
              whiteSpace: 'nowrap', cursor: 'pointer',
            }}
          >
            <LayoutTemplate strokeWidth={1.6} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            Report
            <ChevronDown strokeWidth={1.6} style={{ width: '12px', height: '12px' }} />
          </button>

          {/* Design system chip */}
          <button
            type="button"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              height: '36px', padding: '0 12px', borderRadius: '999px',
              background: '#242424', border: '1px solid #363636',
              fontSize: '15px', color: '#EDEDED',
              whiteSpace: 'nowrap', cursor: 'pointer',
            }}
          >
            <Palette strokeWidth={1.6} style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            Design system
            <ChevronDown strokeWidth={1.6} style={{ width: '12px', height: '12px' }} />
          </button>

          <div style={{ flex: 1 }} />

          {/* Mic */}
          <VoiceInputButton
            onTranscript={(text) => setPrompt((prev) => (prev ? `${prev} ${text}` : text).slice(0, MAX_CHARS))}
            disabled={submitting}
          />

          {/* Send */}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: hasText ? '#fff' : '#3A3A3A',
              display: 'grid', placeItems: 'center', flexShrink: 0,
              opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'default',
              border: 'none',
            }}
          >
            {submitting
              ? <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${hasText ? '#111' : '#8A8A8A'}`, borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
              : <ArrowUp strokeWidth={2} style={{ width: '16px', height: '16px', color: hasText ? '#111' : '#8A8A8A' }} />}
          </button>
        </div>

        {/* Tray */}
        <div style={{
          background: '#232323',
          borderTop: '1px solid #2E2E2E',
          borderRadius: '0 0 16px 16px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Database strokeWidth={1.6} style={{ width: '16px', height: '16px', color: '#8A8A8A', flexShrink: 0 }} />
          <StackPicker value={stackId} onChange={setStackId} recentStacks={recentStacks} />
        </div>
      </div>

      {error !== null && (
        <p style={{ marginTop: '8px', fontSize: '13px', color: 'hsl(var(--color-destructive))' }}>{error}</p>
      )}
    </div>
  );
}
