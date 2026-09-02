'use client';

import { useState } from 'react';
import { Plus, Mic, ArrowUp } from 'lucide-react';
import type { RunPhase } from '@/src/hooks/use-run-events';

interface FollowUpBarProps {
  phase: RunPhase;
  onSubmit: (prompt: string) => void;
}

export function FollowUpBar({ phase, onSubmit }: FollowUpBarProps) {
  const [value, setValue] = useState('');

  const isBuilding = phase !== 'complete' && phase !== 'failed' && phase !== 'connecting';
  const canSubmit = value.trim().length > 0 && !isBuilding;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isBuilding) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <div style={{ flexShrink: 0, padding: '0 22px 16px' }}>
      <div style={{
        background: '#1C1C1C',
        border: '1px solid #2E2E2E',
        borderRadius: '16px',
      }}>
        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask me anything…"
          disabled={isBuilding}
          rows={1}
          style={{
            display: 'block',
            width: '100%',
            resize: 'none',
            background: 'transparent',
            padding: '16px 16px 0',
            fontSize: '15px',
            color: '#fff',
            outline: 'none',
            minHeight: '34px',
            border: 'none',
            fontFamily: 'inherit',
          }}
          className="placeholder:text-[#6B6B6B]"
        />
        {/* Control row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px 12px' }}>
          <button
            type="button"
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #363636', background: '#232323', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}
          >
            <Plus strokeWidth={1.6} style={{ width: '16px', height: '16px', color: '#8A8A8A' }} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #363636', background: '#232323', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}
          >
            <Mic strokeWidth={1.6} style={{ width: '16px', height: '16px', color: '#8A8A8A' }} />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: canSubmit ? '#fff' : '#3A3A3A',
              display: 'grid', placeItems: 'center', flexShrink: 0,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? 'pointer' : 'default',
              border: 'none',
            }}
          >
            <ArrowUp strokeWidth={2} style={{ width: '16px', height: '16px', color: canSubmit ? '#111' : '#8A8A8A' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
