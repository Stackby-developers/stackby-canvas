'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronDown, MoreHorizontal } from 'lucide-react';
import type { Project, ArtifactType } from '@/src/lib/types';
import { ARTIFACT_TYPE_LABEL, formatRelativeTime } from '@/src/lib/format';
import { EmptyState } from './empty-state';

type CanvasTab = 'all' | 'starred' | 'published' | 'apps' | 'presentations' | 'reports';

interface ProjectsListProps {
  initialProjects: Project[];
}

const APP_TYPES: ArtifactType[] = ['dashboard', 'portal', 'gallery', 'form', 'website', 'document'];

const TYPE_EMOJI: Record<string, string> = {
  dashboard: '📊', portal: '🏢', report: '📄', form: '📋', gallery: '🖼️',
  website: '🌐', document: '📝', presentation: '🎞️',
};

const TABS: { value: CanvasTab; label: string }[] = [
  { value: 'all',           label: 'All' },
  { value: 'starred',       label: 'Starred' },
  { value: 'published',     label: 'Published' },
  { value: 'apps',          label: 'Apps' },
  { value: 'presentations', label: 'Presentations' },
  { value: 'reports',       label: 'Reports' },
];

export function ProjectsList({ initialProjects }: ProjectsListProps) {
  const [activeTab, setActiveTab] = useState<CanvasTab>('all');

  function filterByTab(p: Project): boolean {
    switch (activeTab) {
      case 'all':           return true;
      case 'starred':       return false;
      case 'published':     return p.status === 'published';
      case 'apps':          return p.artifactType !== null && APP_TYPES.includes(p.artifactType as ArtifactType);
      case 'presentations': return p.artifactType === 'presentation';
      case 'reports':       return p.artifactType === 'report';
    }
  }

  const visible = initialProjects.filter(filterByTab);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-1">
          <h1 className="text-[26px] font-semibold text-text">Projects</h1>
          <ChevronDown strokeWidth={1.6} className="h-5 w-5 text-text-muted mt-1" />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-[8px] border border-border-active bg-surface px-3 py-2 text-[15px] text-text hover:bg-hover transition-colors duration-150">
            Select projects
          </button>
          <Link
            href="/"
            className="flex items-center gap-1 rounded-[8px] border border-border-bright bg-input px-3 py-2 text-[15px] text-text hover:bg-surface transition-colors duration-150"
          >
            <Plus strokeWidth={1.6} className="h-4 w-4" /> Create new
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-end border-b border-border px-6">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={[
              'mr-5 pb-2 pt-1 text-[15px] border-b-2 transition-colors duration-150 -mb-px',
              activeTab === tab.value
                ? 'border-text text-text font-medium'
                : 'border-transparent text-text-faint hover:text-text-muted',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-4 pb-2">
          <button className="text-[15px] text-text-muted hover:text-text transition-colors duration-150">
            Filter by base ⌄
          </button>
          <button className="text-[15px] text-text-muted hover:text-text transition-colors duration-150">
            Sort: Newest ⌄
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="px-6 py-6">
        {visible.length === 0 ? (
          <EmptyState filter={activeTab === 'published' ? 'published' : activeTab === 'all' ? 'all' : 'draft'} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block group">
                {/* Card: thumbnail only inside border */}
                <div style={{ background: '#282828', border: '1px solid #363636', borderRadius: '14px', padding: '8px', transition: 'border-color 150ms, transform 150ms' }} className="hover:-translate-y-px hover:border-[#4A4A4A]">
                  <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[10px]" style={{ background: '#f6f4ef' }}>
                    <span className="text-5xl opacity-20">
                      {TYPE_EMOJI[project.artifactType ?? 'dashboard'] ?? '🖼️'}
                    </span>
                  </div>
                </div>
                {/* Name + ··· below border */}
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '9px', padding: '0 2px', gap: '4px' }}>
                  <p style={{ flex: 1, fontSize: '15px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</p>
                  <button
                    type="button"
                    onClick={(e) => e.preventDefault()}
                    style={{ flexShrink: 0, padding: '4px', borderRadius: '6px', color: '#8A8A8A', opacity: 0, transition: 'opacity 150ms' }}
                    className="group-hover:opacity-100"
                  >
                    <MoreHorizontal strokeWidth={1.6} style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
                {/* Meta row */}
                <div style={{ display: 'flex', fontSize: '13px', color: '#8A8A8A', padding: '2px 2px 0' }}>
                  <span>{project.artifactType ? (ARTIFACT_TYPE_LABEL[project.artifactType] ?? 'App') : 'App'} · {project.status}</span>
                  <span style={{ marginLeft: 'auto' }}>{project.updatedAt ? formatRelativeTime(typeof project.updatedAt === 'string' ? project.updatedAt : String(project.updatedAt)) : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
