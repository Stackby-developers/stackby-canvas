'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/src/hooks/use-auth';

interface StackPickerProps {
  value: string;
  onChange: (id: string) => void;
  recentStacks?: Array<{ id: string; name: string }>;
}

export function StackPicker({ value, onChange, recentStacks = [] }: StackPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { stacks: authStacks } = useAuth();

  // Merge auth stacks (from connected Stackby account) with recent project stacks, deduped
  const allStacks = [
    ...authStacks,
    ...recentStacks.filter((r) => !authStacks.some((a) => a.id === r.id)),
  ];

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
      <input
        placeholder="Select a base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (allStacks.length > 0) setOpen(true); }}
        autoComplete="off"
        spellCheck={false}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: '15px',
          color: value ? '#EDEDED' : '#6B6B6B',
          width: '100%',
          fontFamily: 'inherit',
        }}
      />
      {open && allStacks.length > 0 && (
        <ul
          className="absolute left-0 right-0 z-20 overflow-hidden"
          style={{ top: 'calc(100% + 8px)', background: '#1E1E1E', border: '1px solid #333', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,.5)', padding: '6px' }}
        >
          <li style={{ padding: '7px 10px 5px', fontSize: '13px', color: '#8A8A8A' }}>
            {authStacks.length > 0 ? 'Your bases' : 'Recent'}
          </li>
          {allStacks.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '8px 10px', borderRadius: '8px', textAlign: 'left', background: value === s.id ? '#282828' : 'transparent', cursor: 'pointer' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s.id);
                  setOpen(false);
                }}
              >
                <span style={{ fontSize: '15px', color: '#EDEDED' }}>{s.name}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8A8A8A' }}>{s.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
