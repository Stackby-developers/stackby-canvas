'use client';

import { useEffect, useState } from 'react';
import { GitBranch, ExternalLink, RefreshCw, Check, AlertCircle, Github } from 'lucide-react';
import {
  Dialog, DialogContent,
  Button, Input, Tabs, TabsList, TabsTrigger, TabsContent, Badge, Separator,
} from '@stackby/ui';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';

type Provider = 'github' | 'gitlab';
type ExportTab = 'new' | 'existing';
type DialogState = 'loading' | 'no_install' | 'linked' | 'unlinked' | 'success' | 'error';

interface RepoLink {
  id: string;
  repo: string;
  branch: string;
  provider: Provider;
  lastStudioSha: string;
}

interface ExportResult {
  url: string;
  sha: string;
  linkId?: string;
  prUrl?: string;
}

interface GitExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  artifactName: string;
  artifactType: string;
  stackId: string;
  stackName: string;
}

function ProviderRadio({ value, current, onChange }: { value: Provider; current: Provider; onChange: (v: Provider) => void }) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={[
        'flex items-center gap-2 rounded-[8px] border px-3 py-2 text-left text-sm transition-colors',
        active ? 'border-accent bg-accent/10 text-text' : 'border-border text-text-muted hover:bg-surface',
      ].join(' ')}
    >
      <span className={['h-3.5 w-3.5 rounded-full border-2 shrink-0', active ? 'border-accent bg-accent' : 'border-border'].join(' ')} />
      {value === 'github' ? 'GitHub' : 'GitLab'}
    </button>
  );
}

function VisibilityRadio({ value, current, onChange }: { value: 'private' | 'public'; current: 'private' | 'public'; onChange: (v: 'private' | 'public') => void }) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={[
        'flex items-center gap-2 rounded-[8px] border px-3 py-2 text-left text-sm transition-colors',
        active ? 'border-accent bg-accent/10 text-text' : 'border-border text-text-muted hover:bg-surface',
      ].join(' ')}
    >
      <span className={['h-3.5 w-3.5 rounded-full border-2 shrink-0', active ? 'border-accent bg-accent' : 'border-border'].join(' ')} />
      {value === 'private' ? 'Private' : 'Public'}
    </button>
  );
}

export function GitExportDialog({
  open, onOpenChange, projectId, artifactName, artifactType, stackId, stackName,
}: GitExportDialogProps) {
  const [state, setState] = useState<DialogState>('loading');
  const [link, setLink] = useState<RepoLink | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<ExportTab>('new');

  // New repo form
  const [repoName, setRepoName] = useState('');
  const [orgOrUser, setOrgOrUser] = useState('');
  const [repoVisibility, setRepoVisibility] = useState<'private' | 'public'>('private');
  const [provider, setProvider] = useState<Provider>('github');

  // Existing repo form
  const [existingRepo, setExistingRepo] = useState('');
  const [newBranch, setNewBranch] = useState('studio-export');
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');

  // Push update form (when already linked)
  const [commitMsg, setCommitMsg] = useState('');
  const [openPR, setOpenPR] = useState(false);
  const [pushPrTitle, setPushPrTitle] = useState('');

  // Sync state
  const [syncResult, setSyncResult] = useState<{ status: 'ahead' | 'behind' | 'diverged' | 'in_sync' } | null>(null);

  useEffect(() => {
    if (!open) return;
    setState('loading');
    setResult(null);
    setError('');
    setSyncResult(null);

    void (async () => {
      try {
        const res = await fetch(`/api/git/links/${projectId}`);
        const data = (await res.json()) as RepoLink | null;
        if (data?.id) {
          setLink(data);
          setState('linked');
          setCommitMsg(`Update ${artifactName} via Stackby Studio`);
          setPushPrTitle(`Update ${artifactName}`);
        } else {
          setLink(null);
          setState('unlinked');
          setRepoName(artifactName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50) || 'my-app');
          setPrTitle(`Export ${artifactName} from Stackby Studio`);
        }
      } catch {
        setState('error');
        setError('Could not check git connection.');
      }
    })();
  }, [open, projectId, artifactName]);

  async function checkSync() {
    if (!link) return;
    try {
      const res = await fetch(`/api/git/sync/${link.id}`);
      const data = (await res.json()) as { status: string };
      setSyncResult(data as { status: 'ahead' | 'behind' | 'diverged' | 'in_sync' });
    } catch { /* ignore */ }
  }

  async function handleExportNew() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/git/export/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, workspaceId: DEV_WORKSPACE_ID, repoName, orgOrUser,
          visibility: repoVisibility, provider, artifactName, artifactType,
          stackId, stackName, bindings: [], sourceFiles: [],
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Export failed');
      }
      const data = (await res.json()) as ExportResult & { linkId: string };
      setResult({ url: data.url, sha: data.sha, linkId: data.linkId });
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExportExisting() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/git/export/existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, workspaceId: DEV_WORKSPACE_ID, repo: existingRepo,
          baseBranch: 'main', newBranch, provider,
          files: [], commitMessage: `Export ${artifactName} from Stackby Studio`,
          prTitle, prBody,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Export failed');
      }
      const data = (await res.json()) as ExportResult;
      setResult(data);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePush() {
    if (!link) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/git/push/${link.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [], commitMessage: commitMsg,
          openPR, prTitle: pushPrTitle,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Push failed');
      }
      const data = (await res.json()) as { url: string; sha: string };
      setResult({ url: data.url, sha: data.sha, linkId: link.id });
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const repoNameValid = /^[a-z0-9-]{3,50}$/.test(repoName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[480px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <GitBranch className="h-4 w-4 text-text-muted shrink-0" />
          <p className="text-sm font-semibold text-text">Export to Git</p>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-5 w-5 text-text-faint animate-spin" />
          </div>
        )}

        {/* No installation */}
        {state === 'no_install' && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 rounded-[10px] border border-border bg-surface p-4">
              <Github className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text">Connect GitHub to export</p>
                <p className="text-xs text-text-muted mt-0.5">Install the Stackby Studio GitHub App to push your artifact code to any repository you own or have access to.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="default" className="gap-1.5" asChild>
                <a href="https://github.com/apps/stackby-studio" target="_blank" rel="noopener noreferrer">
                  <Github className="h-3.5 w-3.5" />
                  Install GitHub App
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setState('unlinked')}>
                I already installed it
              </Button>
            </div>
          </div>
        )}

        {/* Already linked */}
        {state === 'linked' && link && (
          <div className="p-5 space-y-4">
            {/* Repo badge */}
            <div className="flex items-center justify-between rounded-[10px] border border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="h-3.5 w-3.5 text-text-muted shrink-0" />
                <span className="text-sm font-mono text-text truncate">{link.repo}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">{link.branch}</Badge>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0 h-7 gap-1 text-xs" onClick={() => void checkSync()}>
                <RefreshCw className="h-3 w-3" />
                Sync
              </Button>
            </div>

            {syncResult && (
              <p className={['text-xs', syncResult.status === 'in_sync' ? 'text-success' : 'text-warning'].join(' ')}>
                {syncResult.status === 'in_sync' ? '✓ Up to date' :
                 syncResult.status === 'ahead' ? 'Studio is ahead of the repo' :
                 syncResult.status === 'behind' ? 'Repo has changes not in Studio' :
                 'Diverged — manual merge may be needed'}
              </p>
            )}

            <Separator />

            {/* Push form */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-text-muted">Push update</p>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Commit message</label>
                <Input
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Update via Stackby Studio"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openPR}
                  onChange={(e) => setOpenPR(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                <span className="text-xs text-text-muted">Open a pull request</span>
              </label>

              {openPR && (
                <Input
                  value={pushPrTitle}
                  onChange={(e) => setPushPrTitle(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="PR title"
                />
              )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={() => void handlePush()} disabled={!commitMsg.trim() || submitting}>
                {submitting ? 'Pushing…' : 'Push →'}
              </Button>
            </div>
          </div>
        )}

        {/* Unlinked: export to new or existing repo */}
        {state === 'unlinked' && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as ExportTab)} className="w-full">
            <div className="px-5 pt-4">
              <TabsList className="w-full">
                <TabsTrigger value="new" className="flex-1 text-xs">New repository</TabsTrigger>
                <TabsTrigger value="existing" className="flex-1 text-xs">Existing repository</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="new" className="p-5 space-y-3 mt-0">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Repository name</label>
                  <Input
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className={['h-8 text-xs font-mono', !repoNameValid && repoName ? 'border-destructive' : ''].join(' ')}
                    placeholder="my-app"
                  />
                  {!repoNameValid && repoName && (
                    <p className="text-[10px] text-destructive">3–50 lowercase letters, numbers, hyphens</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Owner (org or username)</label>
                  <Input
                    value={orgOrUser}
                    onChange={(e) => setOrgOrUser(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="acme-corp"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-text-muted">Provider</label>
                <div className="flex gap-2">
                  <ProviderRadio value="github" current={provider} onChange={setProvider} />
                  <ProviderRadio value="gitlab" current={provider} onChange={setProvider} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-text-muted">Visibility</label>
                <div className="flex gap-2">
                  <VisibilityRadio value="private" current={repoVisibility} onChange={setRepoVisibility} />
                  <VisibilityRadio value="public" current={repoVisibility} onChange={setRepoVisibility} />
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  className="text-xs text-text-muted hover:text-text underline underline-offset-2"
                  onClick={() => setState('no_install')}
                >
                  No GitHub access?
                </button>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={() => void handleExportNew()}
                    disabled={!repoNameValid || !orgOrUser.trim() || submitting}
                  >
                    {submitting ? 'Exporting…' : 'Create & export →'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="p-5 space-y-3 mt-0">
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Repository (owner/repo)</label>
                <Input
                  value={existingRepo}
                  onChange={(e) => setExistingRepo(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="acme-corp/my-app"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">New branch</label>
                  <Input
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="studio-export"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-muted">Provider</label>
                  <div className="flex gap-1.5 pt-0.5">
                    <ProviderRadio value="github" current={provider} onChange={setProvider} />
                    <ProviderRadio value="gitlab" current={provider} onChange={setProvider} />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-text-muted">PR title</label>
                <Input
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Export from Stackby Studio"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => void handleExportExisting()}
                  disabled={!existingRepo.includes('/') || !newBranch.trim() || submitting}
                >
                  {submitting ? 'Exporting…' : 'Export & open PR →'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-sm">{error || 'Something went wrong.'}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}

        {/* Success state */}
        {state === 'success' && result && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
                <Check className="h-3 w-3 text-success" />
              </span>
              <p className="text-sm font-semibold text-text">
                {result.prUrl ? 'PR opened' : 'Exported'}
              </p>
            </div>

            <div className="rounded-[8px] border border-border bg-surface px-3 py-2">
              <p className="text-xs font-mono text-text-muted break-all">{result.url}</p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" asChild>
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in {link?.provider === 'gitlab' ? 'GitLab' : 'GitHub'}
                </a>
              </Button>
              {result.prUrl && (
                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                  <a href={result.prUrl} target="_blank" rel="noopener noreferrer">
                    <GitBranch className="h-3.5 w-3.5" />
                    View PR
                  </a>
                </Button>
              )}
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
