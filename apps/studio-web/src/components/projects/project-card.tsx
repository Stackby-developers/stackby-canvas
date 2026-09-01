'use client';

import Link from 'next/link';
import {
  BarChart2,
  Layout,
  FileText,
  ClipboardList,
  Grid,
  Globe,
  Presentation,
} from 'lucide-react';
import { Badge } from '@stackby/ui';
import type { Project, ArtifactType } from '@/src/lib/types';
import { ARTIFACT_TYPE_LABEL, RUN_STATUS_CONFIG, formatRelativeTime } from '@/src/lib/format';

const ARTIFACT_ICONS: Record<ArtifactType, React.ElementType> = {
  dashboard: BarChart2,
  portal: Layout,
  report: FileText,
  form: ClipboardList,
  gallery: Grid,
  website: Globe,
  document: FileText,
  presentation: Presentation,
};

const THUMBNAIL_GRADIENT: Record<ArtifactType, string> = {
  dashboard: 'from-accent/10 to-accent/5',
  portal: 'from-purple-500/10 to-purple-500/5',
  report: 'from-emerald-500/10 to-emerald-500/5',
  form: 'from-amber-500/10 to-amber-500/5',
  gallery: 'from-rose-500/10 to-rose-500/5',
  website: 'from-sky-500/10 to-sky-500/5',
  document: 'from-slate-500/10 to-slate-500/5',
  presentation: 'from-fuchsia-500/10 to-fuchsia-500/5',
};

const STATUS_BADGE_VARIANT = {
  draft: 'outline',
  published: 'success',
  archived: 'secondary',
} as const;

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { id, name, stackId, status, artifactType, updatedAt, latestRunStatus } = project;

  const Icon = artifactType ? ARTIFACT_ICONS[artifactType] : FileText;
  const gradient = artifactType
    ? THUMBNAIL_GRADIENT[artifactType]
    : 'from-bg-muted to-bg-elevated';
  const typeLabel = artifactType ? (ARTIFACT_TYPE_LABEL[artifactType] ?? artifactType) : null;
  const runConfig =
    latestRunStatus && latestRunStatus in RUN_STATUS_CONFIG
      ? RUN_STATUS_CONFIG[latestRunStatus]
      : null;
  const badgeVariant = STATUS_BADGE_VARIANT[status] ?? 'outline';

  return (
    <Link href={`/projects/${id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
      <div className="flex flex-col rounded-lg border border-border bg-bg-elevated hover:border-border hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 shrink-0 text-text-muted" />
            <span className="truncate text-sm font-medium text-text">{name}</span>
          </div>
          <Badge variant={badgeVariant} className="shrink-0 capitalize">
            {status}
          </Badge>
        </div>

        {typeLabel && (
          <p className="px-4 pb-2 text-xs text-text-faint">
            {typeLabel} · <span className="font-mono">{stackId.slice(0, 12)}…</span>
          </p>
        )}

        <div className={`h-28 bg-gradient-to-br ${gradient}`} />

        <div className="flex items-center justify-between px-4 py-3 text-xs">
          {runConfig ? (
            <span className={`flex items-center ${runConfig.colorClass}`}>
              <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current ${runConfig.pulse ? 'animate-pulse' : ''}`}
              />
              {runConfig.label}
            </span>
          ) : (
            <span className="text-text-faint">No runs yet</span>
          )}
          <span className="text-text-faint">{formatRelativeTime(updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
