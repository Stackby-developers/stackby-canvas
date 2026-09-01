'use client';

import { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Input, Button } from '@stackby/ui';
import type { RunPhase } from '@/src/hooks/use-run-events';

interface FollowUpBarProps {
  phase: RunPhase;
  onSubmit: (prompt: string) => void;
}

export function FollowUpBar({ phase, onSubmit }: FollowUpBarProps) {
  const [value, setValue] = useState('');

  if (phase !== 'complete' && phase !== 'failed') return null;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-border bg-bg-elevated px-4 py-3">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for changes…"
          className="flex-1 text-sm"
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!value.trim()}
          aria-label="Send follow-up"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
