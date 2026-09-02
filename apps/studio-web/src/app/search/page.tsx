'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="flex h-full items-start justify-center pt-20 px-6">
      <div
        className="w-full max-w-[890px] rounded-[14px] border border-border overflow-hidden"
        style={{ background: '#1C1C1C', boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <Search strokeWidth={1.5} className="h-5 w-5 shrink-0 text-text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-transparent text-[18px] text-text placeholder:text-text-faint outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-text-faint hover:text-text-muted transition-colors duration-150"
            >
              <X strokeWidth={1.5} className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex min-h-[400px]">
          {/* Left result list */}
          <div className="w-[370px] shrink-0 border-r border-border overflow-auto p-2">
            <p className="px-3 py-1.5 text-[13px] text-text-faint font-medium">August</p>
            {['Employee Directory Dashboard', 'Regional Athletic Launch Hub'].map((name, i) => (
              <button
                key={i}
                type="button"
                className="flex h-10 w-full items-center gap-3 rounded-[8px] px-3 text-[15px] text-text-secondary hover:bg-surface transition-colors duration-150"
              >
                <div className="h-4 w-4 shrink-0 rounded-[3px] border border-border-active" />
                <span className="truncate">{name}</span>
              </button>
            ))}
          </div>

          {/* Right preview */}
          <div className="flex-1 p-5">
            <div className="mb-4 flex aspect-[16/10] w-full items-center justify-center rounded-[10px] bg-surface">
              <span className="text-5xl opacity-20">📊</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-[13px]">
              <div>
                <p className="mb-1 text-text-faint">Type</p>
                <p className="text-text">App</p>
              </div>
              <div>
                <p className="mb-1 text-text-faint">Status</p>
                <p className="text-text">Draft</p>
              </div>
              <div>
                <p className="mb-1 text-text-faint">Last edited</p>
                <p className="text-text">1w ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Link
            href="/projects"
            className="rounded-[8px] px-3 py-2 text-[15px] text-text-muted hover:bg-hover hover:text-text transition-colors duration-150"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="flex items-center gap-2 rounded-[8px] bg-accent px-3 py-2 text-[15px] text-white hover:opacity-90 transition-opacity"
          >
            Open project{' '}
            <kbd className="rounded-[4px] border border-white/20 px-1 text-[11px]">↵</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
