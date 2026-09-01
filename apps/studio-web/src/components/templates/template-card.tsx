'use client';

import { ArrowRight } from 'lucide-react';
import { Card, Badge, Button } from '@stackby/ui';
import type { Template } from '@/src/lib/templates';

const GRADIENT_BY_TYPE: Record<string, string> = {
  dashboard: 'from-accent/20 to-accent/5',
  portal: 'from-purple-500/20 to-purple-500/5',
  report: 'from-emerald-500/20 to-emerald-500/5',
  form: 'from-amber-500/20 to-amber-500/5',
  gallery: 'from-rose-500/20 to-rose-500/5',
};

interface TemplateCardProps {
  template: Template;
  onUse: (t: Template) => void;
}

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  const gradient = GRADIENT_BY_TYPE[template.type] ?? 'from-bg-muted to-bg-elevated';
  const requiredCount = template.schema.flatMap((e) => e.fields).filter((f) => f.required).length;

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className={`flex h-20 items-center justify-center bg-gradient-to-br ${gradient}`}>
        <span className="text-4xl" role="img" aria-hidden="true">{template.icon}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-text leading-tight">{template.name}</span>
          <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{template.type}</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-text-muted">{template.category}</p>
          <p className="text-xs text-text-faint leading-relaxed">{template.description}</p>
        </div>
        <p className="text-[11px] text-text-faint">{requiredCount} required fields</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-auto w-full"
          onClick={() => onUse(template)}
        >
          Use template
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
