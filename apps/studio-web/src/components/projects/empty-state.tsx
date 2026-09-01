import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Button } from '@stackby/ui';

type FilterTab = 'all' | 'draft' | 'published' | 'archived';

const MESSAGES: Record<FilterTab, { title: string; description: string; cta?: string }> = {
  all: {
    title: 'No projects yet',
    description: 'Start building from the Home page.',
    cta: 'New project',
  },
  draft: {
    title: 'No draft projects',
    description: 'Start a new build to create one.',
    cta: 'New project',
  },
  published: {
    title: 'Nothing published yet',
    description: 'Publish a ready artifact to see it here.',
  },
  archived: {
    title: 'No archived projects',
    description: 'Archived projects will appear here.',
  },
};

interface EmptyStateProps {
  filter: FilterTab;
}

export function EmptyState({ filter }: EmptyStateProps) {
  const { title, description, cta } = MESSAGES[filter];

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
      <Inbox className="h-10 w-10 text-text-faint" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      {cta && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/">{cta}</Link>
        </Button>
      )}
    </div>
  );
}
