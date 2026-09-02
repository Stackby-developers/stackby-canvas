'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Project } from '@/src/lib/types';
import { ARTIFACT_TYPE_LABEL } from '@/src/lib/format';

interface HomeProjectFeedProps {
  projects: Project[];
}

const TYPE_EMOJI: Record<string, string> = {
  dashboard: '📊',
  portal: '🏢',
  report: '📄',
  form: '📋',
  gallery: '🖼️',
};

export function HomeProjectFeed({ projects }: HomeProjectFeedProps) {
  const [tab, setTab] = useState<'latest' | 'starter'>('latest');

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
      {/* Tab row */}
      <div className="flex items-center border-b border-border px-5 pt-1">
        {(['latest', 'starter'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'mr-5 pb-2.5 pt-2 text-[15px] transition-colors duration-150 border-b-2',
              tab === t
                ? 'border-text text-text font-medium'
                : 'border-transparent text-text-faint hover:text-text-muted',
            ].join(' ')}
          >
            {t === 'latest' ? 'Latest' : 'Starter ideas'}
          </button>
        ))}
        <div className="flex-1" />
        <Link
          href="/projects"
          className="pb-2 pt-2 text-[15px] text-text-faint hover:text-text-muted transition-colors duration-150"
        >
          View all ↗
        </Link>
      </div>

      {/* Cards */}
      <div className="p-5">
        {tab === 'latest' ? (
          projects.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-text-faint">
              No projects yet — start building above.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="block">
                  <div style={{ background: '#282828', border: '1px solid #363636', borderRadius: '14px', padding: '8px', transition: 'border-color 150ms, transform 150ms' }} className="hover:-translate-y-px hover:border-[#4A4A4A]">
                    {/* Thumbnail 16:10 */}
                    <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[10px]" style={{ background: '#f6f4ef' }}>
                      <span className="text-4xl opacity-30">
                        {TYPE_EMOJI[p.artifactType ?? 'dashboard'] ?? '🖼️'}
                      </span>
                    </div>
                  </div>
                  {/* Name + date: below the card border */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '9px', padding: '0 2px' }}>
                    <p style={{ flex: 1, fontSize: '15px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ fontSize: '13px', color: '#8A8A8A', flexShrink: 0 }}>1w</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          <p className="py-10 text-center text-[15px] text-text-faint">
            Starter ideas —{' '}
            <Link href="/templates" className="text-text-muted hover:text-text transition-colors">
              browse templates
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
