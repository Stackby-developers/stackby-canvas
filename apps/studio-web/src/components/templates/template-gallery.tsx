'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@stackby/ui';
import { cn } from '@stackby/ui';
import { TEMPLATES, CATEGORIES, type Template, type ArtifactType } from '@/src/lib/templates';
import { TemplateCard } from './template-card';
import { StackMappingDialog } from './stack-mapping-dialog';

const ARTIFACT_TYPES: Array<ArtifactType | 'all'> = ['all', 'dashboard', 'portal', 'report', 'form', 'gallery'];

const TYPE_LABEL: Record<string, string> = {
  all: 'All types',
  dashboard: 'Dashboard',
  portal: 'Portal',
  report: 'Report',
  form: 'Form',
  gallery: 'Gallery',
};

interface TemplateGalleryProps {
  initialTemplateId?: string | undefined;
}

export function TemplateGallery({ initialTemplateId }: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<ArtifactType | 'all'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [mappingTemplate, setMappingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (initialTemplateId) {
      const found = TEMPLATES.find((t) => t.id === initialTemplateId);
      if (found) setMappingTemplate(found);
    }
  }, [initialTemplateId]);

  const filtered = TEMPLATES.filter((t) => {
    if (activeType !== 'all' && t.type !== activeType) return false;
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Templates</h1>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="pl-8"
          />
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ARTIFACT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              activeType === type
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-border bg-transparent text-text-muted hover:text-text',
            )}
          >
            {TYPE_LABEL[type] ?? type}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            activeCategory === 'all'
              ? 'border-accent/40 bg-accent/15 text-accent'
              : 'border-border bg-transparent text-text-muted hover:text-text',
          )}
        >
          All categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              activeCategory === cat
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-border bg-transparent text-text-muted hover:text-text',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
          <p className="text-sm font-medium text-text">No templates found</p>
          <p className="text-xs text-text-muted">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} onUse={setMappingTemplate} />
          ))}
        </div>
      )}

      {mappingTemplate && (
        <StackMappingDialog
          template={mappingTemplate}
          open={true}
          onOpenChange={(o) => { if (!o) setMappingTemplate(null); }}
        />
      )}
    </div>
  );
}
