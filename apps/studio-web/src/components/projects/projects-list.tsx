'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button, Input, Tabs, TabsList, TabsTrigger, TabsContent } from '@stackby/ui';
import type { Project, ProjectStatus } from '@/src/lib/types';
import { ProjectCard } from './project-card';
import { EmptyState } from './empty-state';

type FilterTab = 'all' | ProjectStatus;

interface ProjectsListProps {
  initialProjects: Project[];
}

export function ProjectsList({ initialProjects }: ProjectsListProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const counts: Record<FilterTab, number> = {
    all: initialProjects.length,
    draft: initialProjects.filter((p) => p.status === 'draft').length,
    published: initialProjects.filter((p) => p.status === 'published').length,
    archived: initialProjects.filter((p) => p.status === 'archived').length,
  };

  const visible = initialProjects
    .filter((p) => activeTab === 'all' || p.status === activeTab)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const tabs: { value: FilterTab; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-text">Projects</h1>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="max-w-xs"
          />
          <Button size="sm" asChild>
            <Link href="/">
              <Plus className="mr-1.5 h-4 w-4" />
              New project
            </Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => { setActiveTab(v as FilterTab); }}
      >
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {counts[tab.value] > 0 && (
                <span className="ml-1.5 tabular-nums text-text-faint">
                  {counts[tab.value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {visible.length === 0 ? (
              <EmptyState filter={tab.value} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
