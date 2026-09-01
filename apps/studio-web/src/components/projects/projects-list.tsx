'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Input } from '@stackby/ui';
import type { Project, ArtifactType } from '@/src/lib/types';
import { ProjectCard } from './project-card';
import { EmptyState } from './empty-state';

type CanvasTab = 'all' | 'starred' | 'published' | 'apps' | 'presentations' | 'reports';

interface ProjectsListProps {
  initialProjects: Project[];
}

const APP_TYPES: ArtifactType[] = ['dashboard', 'portal', 'gallery', 'form'];

export function ProjectsList({ initialProjects }: ProjectsListProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<CanvasTab>('all');

  function filterByTab(p: Project): boolean {
    switch (activeTab) {
      case 'all': return true;
      case 'starred': return false; // placeholder
      case 'published': return p.status === 'published';
      case 'apps': return p.artifactType !== null && APP_TYPES.includes(p.artifactType);
      case 'presentations': return p.artifactType === 'presentation';
      case 'reports': return p.artifactType === 'report';
    }
  }

  const visible = initialProjects
    .filter(filterByTab)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const tabs: { value: CanvasTab; label: string }[] = [
    { value: 'all',           label: 'All' },
    { value: 'starred',       label: 'Starred' },
    { value: 'published',     label: 'Published' },
    { value: 'apps',          label: 'Apps' },
    { value: 'presentations', label: 'Presentations' },
    { value: 'reports',       label: 'Reports' },
  ];

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button className="flex items-center gap-1 text-2xl font-semibold text-text hover:text-text-muted transition-colors">
          Projects <ChevronDown className="h-5 w-5 mt-0.5" />
        </button>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-border bg-bg px-3.5 py-1.5 text-sm font-medium text-text hover:bg-bg-muted transition-colors">
            Select projects
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg bg-text px-3.5 py-1.5 text-sm font-medium text-bg hover:opacity-80 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Create new
          </Link>
        </div>
      </div>

      {/* Tabs + filter row */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-1 pb-3 mr-5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.value
                  ? 'border-text text-text'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-3">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs w-40"
          />
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted border border-border hover:bg-bg-muted transition-colors">
            <SlidersHorizontal className="h-3 w-3" /> Filter by base <ChevronDown className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted border border-border hover:bg-bg-muted transition-colors">
            Sort: Newest <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <EmptyState filter={activeTab === 'published' ? 'published' : activeTab === 'all' ? 'all' : 'draft'} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
