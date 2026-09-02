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
                  <div className="rounded-[14px] border border-border-strong bg-surface p-2 transition-all duration-150 hover:-translate-y-px hover:border-border-bright cursor-pointer">
                    {/* Thumbnail 16:10 */}
                    <div className="mb-2 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[10px] bg-hover">
                      <span className="text-4xl opacity-20">
                        {TYPE_EMOJI[p.artifactType ?? 'dashboard'] ?? '🖼️'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between px-0.5">
                      <p className="truncate text-[15px] font-medium text-text">{p.name}</p>
                      <p className="ml-2 shrink-0 text-[13px] text-text-faint">1w</p>
                    </div>
                    <p className="px-0.5 text-[13px] text-text-faint">
                      {p.artifactType ? (ARTIFACT_TYPE_LABEL[p.artifactType] ?? 'App') : 'App'}
                    </p>
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
