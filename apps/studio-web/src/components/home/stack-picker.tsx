'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Input, Tooltip, TooltipContent, TooltipTrigger, cn } from '@stackby/ui';

interface StackPickerProps {
  value: string;
  onChange: (id: string) => void;
  recentStacks?: Array<{ id: string; name: string }>;
}

export function StackPicker({ value, onChange, recentStacks = [] }: StackPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <label className="shrink-0 text-xs font-medium text-text-muted">Stack ID</label>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-faint" />
          </TooltipTrigger>
          <TooltipContent side="top">Paste your Stackby base ID</TooltipContent>
        </Tooltip>
      </div>
      <Input
        className="mt-1 font-mono text-xs"
        placeholder="sty_xxxxxxxx"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (recentStacks.length > 0) setOpen(true); }}
        autoComplete="off"
        spellCheck={false}
      />
      {open && recentStacks.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-bg-elevated shadow-lg">
          <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Recent
          </li>
          {recentStacks.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-bg-muted',
                  value === s.id && 'bg-accent/10',
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s.id);
                  setOpen(false);
                }}
              >
                <span className="text-xs font-medium text-text">{s.name}</span>
                <span className="font-mono text-[10px] text-text-faint">{s.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
