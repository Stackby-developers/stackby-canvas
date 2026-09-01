'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { Project } from '@/src/lib/types';
import { ARTIFACT_TYPE_LABEL } from '@/src/lib/format';

interface HomeProjectFeedProps {
  projects: Project[];
}

export function HomeProjectFeed({ projects }: HomeProjectFeedProps) {
  const [tab, setTab] = useState<'latest' | 'starter'>('latest');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 border-b border-border">
        <div className="flex">
          {(['latest', 'starter'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-1 pb-3 mr-5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t ? 'border-text text-text' : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {t === 'latest' ? 'Latest' : 'Starter ideas'}
            </button>
          ))}
        </div>
        <Link href="/projects" className="text-sm text-text-muted hover:text-text transition-colors pb-3">
          View all ↗
        </Link>
      </div>

      {tab === 'latest' ? (
        projects.length === 0 ? (
          <p className="text-sm text-text-faint text-center py-12">
            No projects yet. Start building above.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="group block">
                <div className="rounded-xl border border-border overflow-hidden hover:shadow-md transition-all bg-bg">
                  <div className="h-40 bg-bg-muted flex items-center justify-center">
                    <span className="text-4xl opacity-20">
                      {p.artifactType === 'dashboard'
                        ? '📊'
                        : p.artifactType === 'portal'
                          ? '🏢'
                          : p.artifactType === 'report'
                            ? '📄'
                            : p.artifactType === 'form'
                              ? '📋'
                              : '🖼️'}
                    </span>
                  </div>
                  <div className="p-3 border-t border-border">
                    <p className="text-sm font-medium text-text truncate">{p.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {p.artifactType ? ARTIFACT_TYPE_LABEL[p.artifactType] : 'App'} · {p.status}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        <p className="text-sm text-text-faint text-center py-12">
          Starter ideas coming soon. Check the{' '}
          <Link href="/templates" className="text-accent hover:underline">
            Templates
          </Link>{' '}
          page.
        </p>
      )}
    </div>
  );
}
