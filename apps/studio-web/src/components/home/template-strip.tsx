'use client';

import { Card, Badge } from '@stackby/ui';

const TEMPLATES = [
  { id: 'crm-dashboard', name: 'CRM Dashboard', type: 'dashboard', icon: '📊', description: 'Pipeline and deals overview' },
  { id: 'project-tracker', name: 'Project Tracker', type: 'portal', icon: '🗂️', description: 'Tasks, deadlines, and owners' },
  { id: 'invoice-portal', name: 'Invoice Portal', type: 'portal', icon: '🧾', description: 'Client billing and status' },
  { id: 'inventory-gallery', name: 'Inventory', type: 'gallery', icon: '📦', description: 'Product catalog with search' },
  { id: 'team-form', name: 'Request Form', type: 'form', icon: '📋', description: 'Internal request intake' },
  { id: 'status-report', name: 'Status Report', type: 'report', icon: '📄', description: 'Weekly snapshot for stakeholders' },
] as const;

type Template = (typeof TEMPLATES)[number];

interface TemplateStripProps {
  onSelect: (t: Template) => void;
}

export function TemplateStrip({ onSelect }: TemplateStripProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {TEMPLATES.map((t) => (
        <button key={t.id} type="button" onClick={() => onSelect(t)} className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded-lg">
          <Card className="flex w-44 flex-col gap-2 p-3 text-left transition-colors hover:border-border hover:bg-bg-muted cursor-pointer">
            <span className="text-xl leading-none" role="img" aria-hidden="true">{t.icon}</span>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text">{t.name}</span>
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{t.type}</Badge>
              </div>
              <p className="text-[11px] leading-relaxed text-text-faint">{t.description}</p>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
