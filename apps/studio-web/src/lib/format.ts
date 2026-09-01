export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const ARTIFACT_TYPE_LABEL: Record<string, string> = {
  dashboard: 'Dashboard',
  portal: 'Portal',
  report: 'Report',
  form: 'Form',
  gallery: 'Gallery',
  website: 'Website',
  document: 'Document',
  presentation: 'Presentation',
};

export const RUN_STATUS_CONFIG: Record<
  string,
  { label: string; colorClass: string; pulse: boolean }
> = {
  pending: { label: 'Pending', colorClass: 'text-text-faint', pulse: false },
  intent: { label: 'Analyzing…', colorClass: 'text-warning', pulse: true },
  schema: { label: 'Reading schema…', colorClass: 'text-warning', pulse: true },
  clarification: { label: 'Clarifying…', colorClass: 'text-warning', pulse: true },
  plan_review: { label: 'Plan ready', colorClass: 'text-accent', pulse: false },
  building: { label: 'Building…', colorClass: 'text-warning', pulse: true },
  verifying: { label: 'Verifying…', colorClass: 'text-warning', pulse: true },
  fixing: { label: 'Fixing…', colorClass: 'text-warning', pulse: true },
  ready: { label: 'Ready', colorClass: 'text-success', pulse: false },
  failed: { label: 'Failed', colorClass: 'text-destructive', pulse: false },
};
