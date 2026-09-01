'use client';

import { useState } from 'react';
import { Rocket, Copy, Check, ExternalLink, AlertTriangle, ChevronLeft } from 'lucide-react';
import {
  Popover, PopoverTrigger, PopoverContent,
  Button, Input, Badge, Tooltip, TooltipTrigger, TooltipContent,
} from '@stackby/ui';
import { VersionHistory } from './version-history';
import { DEV_WORKSPACE_ID, DEV_USER_ID } from '@/src/lib/dev-constants';

type VisibilityMode = 'stack_collaborators' | 'workspace' | 'link' | 'password' | 'public';
type PublishStep = 'configure' | 'confirm_public' | 'done';

interface PlanStep {
  id: string;
  type: string;
  title: string;
  tables: string[];
  columns: string[];
}

interface Plan {
  id: string;
  runId: string;
  intent: string;
  artifactType: string;
  stackId: string;
  steps: PlanStep[];
}

interface PublishResult {
  deploymentId: string;
  versionId: string;
  previewUrl: string;
  publishedAt: string;
}

interface PublishPopoverProps {
  projectId: string;
  runId: string | null;
  plan: Plan | null;
  isReady: boolean;
}

const VISIBILITY_OPTIONS: { value: VisibilityMode; label: string; description: string; warn?: boolean }[] = [
  { value: 'stack_collaborators', label: 'Stack collaborators', description: 'Only people with Stackby access' },
  { value: 'workspace', label: 'Workspace members', description: 'Anyone in your workspace' },
  { value: 'link', label: 'Anyone with link', description: 'Anyone who has the URL' },
  { value: 'password', label: 'Password protected', description: 'Requires a password' },
  { value: 'public', label: 'Public', description: 'Anyone on the internet', warn: true },
];

export function PublishPopover({ projectId, runId, plan, isReady }: PublishPopoverProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PublishStep>('configure');
  const [slug, setSlug] = useState('');
  const [visibility, setVisibility] = useState<VisibilityMode>('stack_collaborators');
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [copied, setCopied] = useState(false);

  const tables = [...new Set(plan?.steps.flatMap((s) => s.tables) ?? [])];
  const columns = [...new Set(plan?.steps.flatMap((s) => s.columns) ?? [])];

  function resetState() {
    setStep('configure');
    setSlug('');
    setVisibility('stack_collaborators');
    setPassword('');
    setUnderstood(false);
    setError(null);
    setResult(null);
    setCopied(false);
  }

  async function handlePublish() {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        workspaceId: DEV_WORKSPACE_ID,
        projectId,
        artifactId: runId ?? projectId,
        versionId: runId ?? projectId,
        buildHash: 'dev',
        visibility,
        permissions: { camera: false, clipboardRead: false, clipboardWrite: false, geolocation: false },
        publishedByUserId: DEV_USER_ID,
      };
      if (slug.trim()) body['slug'] = slug.trim();
      if (visibility === 'password' && password) body['passwordHash'] = password;
      if (visibility === 'public') {
        body['confirmation'] = {
          tablesBecomingReadable: tables.map((name) => ({ tableId: name, tableName: name })),
          columnsBecomingReadable: plan?.steps.flatMap((s) =>
            s.columns.map((col) => ({ columnId: col, columnName: col, tableId: s.tables[0] ?? '' })),
          ) ?? [],
          confirmedByUserId: DEV_USER_ID,
          confirmedAt: new Date().toISOString(),
        };
      }

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? 'Publish failed');
      }
      const data = (await res.json()) as PublishResult;
      setResult(data);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRollback(versionNumber: number) {
    if (!result) return;
    await fetch(`/api/publish/${result.deploymentId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionNumber }),
    });
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const trigger = isReady ? (
    <Button size="sm" variant="default" className="gap-1.5">
      <Rocket className="h-3.5 w-3.5" />
      Publish
    </Button>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button size="sm" variant="ghost" disabled className="gap-1.5 cursor-not-allowed">
            <Rocket className="h-3.5 w-3.5" />
            Publish
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Preview must be ready to publish</TooltipContent>
    </Tooltip>
  );

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <PopoverTrigger asChild>
        <span>{trigger}</span>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {step === 'configure' && (
          <div className="p-4 space-y-4">
            <p className="text-sm font-semibold text-text">Publish artifact</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">URL slug (optional)</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated"
                className="h-8 text-xs font-mono"
              />
              {slug && (
                <p className="text-[11px] text-text-faint font-mono">
                  https://{slug}.studio.stackby.com
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Visibility</label>
              <div className="space-y-1">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={[
                      'w-full flex items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                      visibility === opt.value
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:bg-bg-muted',
                    ].join(' ')}
                  >
                    <span className={[
                      'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2',
                      visibility === opt.value ? 'border-accent bg-accent' : 'border-border',
                    ].join(' ')} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-text">{opt.label}</span>
                        {opt.warn && <AlertTriangle className="h-3 w-3 text-warning" />}
                      </div>
                      <p className="text-[11px] text-text-faint">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {visibility === 'password' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a password"
                  className="h-8 text-xs"
                />
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              {visibility === 'public' ? (
                <Button size="sm" onClick={() => setStep('confirm_public')}>Next →</Button>
              ) : (
                <Button size="sm" onClick={handlePublish} disabled={submitting}>
                  {submitting ? 'Publishing…' : 'Publish →'}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'confirm_public' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <p className="text-sm font-semibold text-text">Public publish confirmation</p>
            </div>
            <p className="text-xs text-text-muted">
              The following data will be readable by <strong>anyone on the internet</strong>:
            </p>

            {tables.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted">Tables</p>
                <div className="flex flex-wrap gap-1">
                  {tables.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                      <Check className="h-2.5 w-2.5" />{t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {columns.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted">Columns</p>
                <div className="flex flex-wrap gap-1">
                  {columns.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px] gap-1">
                      <Check className="h-2.5 w-2.5" />{c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
              />
              <span className="text-xs text-text-muted">
                I understand this data will be publicly accessible
              </span>
            </label>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-between gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setStep('configure')}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />Back
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={!understood || submitting}
              >
                {submitting ? 'Publishing…' : 'Publish publicly →'}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
                <Check className="h-3 w-3 text-success" />
              </span>
              <p className="text-sm font-semibold text-text">Published</p>
            </div>

            <div className="rounded-md border border-border bg-bg-muted px-3 py-2">
              <p className="text-xs font-mono text-text-muted break-all">{result.previewUrl}</p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={result.previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted">Version history</p>
              <VersionHistory
                deploymentId={result.deploymentId}
                activeVersionId={result.versionId}
                onRollback={handleRollback}
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
