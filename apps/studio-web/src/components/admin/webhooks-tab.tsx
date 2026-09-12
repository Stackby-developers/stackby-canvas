'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Check, ExternalLink, RefreshCw, Circle } from 'lucide-react';
import { Button, Input, Badge, Spinner, Dialog, DialogContent } from '@stackby/ui';
import { DEV_WORKSPACE_ID, DEV_USER_ID } from '@/src/lib/dev-constants';

const ALL_EVENTS = [
  { value: 'artifact.published',   label: 'Artifact published' },
  { value: 'artifact.unpublished', label: 'Artifact unpublished' },
  { value: 'run.completed',        label: 'Build run completed' },
  { value: 'run.failed',           label: 'Build run failed' },
  { value: 'run.started',          label: 'Build run started' },
];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  description?: string;
  active: boolean;
  createdAt: string;
  lastFiredAt?: string;
  failureCount: number;
}

interface Delivery {
  id: string;
  event: string;
  responseStatus?: number;
  durationMs?: number;
  success: boolean;
  deliveredAt: string;
}

interface NewWebhookForm {
  url: string;
  events: string[];
  description: string;
}

export function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<NewWebhookForm>({ url: '', events: ['artifact.published'], description: '' });
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [deliveriesFor, setDeliveriesFor] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  async function loadWebhooks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/webhooks?workspaceId=${DEV_WORKSPACE_ID}`);
      const data = (await res.json()) as { webhooks: Webhook[] };
      setWebhooks(data.webhooks ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadWebhooks(); }, []);

  async function handleCreate() {
    if (!form.url || form.events.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workspaceId: DEV_WORKSPACE_ID, createdByUserId: DEV_USER_ID }),
      });
      const data = (await res.json()) as Webhook & { secret?: string };
      if (data.secret) setNewSecret(data.secret);
      setForm({ url: '', events: ['artifact.published'], description: '' });
      await loadWebhooks();
    } catch { /* ignore */ }
    finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/webhooks/${id}?workspaceId=${DEV_WORKSPACE_ID}`, { method: 'DELETE' });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function loadDeliveries(id: string) {
    setDeliveriesFor(id);
    setLoadingDeliveries(true);
    try {
      const res = await fetch(`/api/webhooks/${id}/deliveries?workspaceId=${DEV_WORKSPACE_ID}`);
      const data = (await res.json()) as { deliveries: Delivery[] };
      setDeliveries(data.deliveries ?? []);
    } catch { setDeliveries([]); }
    finally { setLoadingDeliveries(false); }
  }

  function toggleEvent(ev: string) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text">Webhook subscriptions</p>
          <p className="text-xs text-text-muted mt-0.5">Receive HTTP POST notifications when Studio events occur. Use with Zapier, Make, or any HTTP endpoint.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add webhook
        </Button>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center"><Spinner /></div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-[10px] border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">No webhooks yet.</p>
          <p className="text-xs text-text-faint mt-1">Add one to start receiving events in Zapier, Make, or your own endpoint.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-[10px] border border-border bg-surface px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Circle className={`h-2 w-2 shrink-0 ${wh.active ? 'fill-success text-success' : 'fill-text-faint text-text-faint'}`} />
                    <p className="text-sm font-mono text-text truncate">{wh.url}</p>
                  </div>
                  {wh.description && <p className="text-xs text-text-muted ml-4 mt-0.5">{wh.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-2 ml-4">
                    {wh.events.map((ev) => (
                      <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => void loadDeliveries(wh.id)}>
                    <RefreshCw className="h-3 w-3" />
                    Deliveries
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" onClick={() => void handleDelete(wh.id)} aria-label="Delete webhook">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {wh.failureCount > 0 && (
                <p className="text-xs text-warning ml-4">{wh.failureCount} consecutive failure{wh.failureCount !== 1 ? 's' : ''}{wh.failureCount >= 10 ? ' — webhook disabled' : ''}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="w-[480px] p-0 gap-0">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold text-text">Add webhook</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Endpoint URL</label>
              <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://your-server.com/webhook" className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Events</label>
              <div className="space-y-1">
                {ALL_EVENTS.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input type="checkbox" checked={form.events.includes(ev.value)} onChange={() => toggleEvent(ev.value)} className="h-4 w-4 rounded border-border accent-accent" />
                    <span className="text-sm text-text">{ev.label}</span>
                    <span className="text-xs text-text-faint font-mono">({ev.value})</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Description (optional)</label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Notify Slack on publish" className="h-8 text-xs" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={() => void handleCreate()} disabled={!form.url.trim() || form.events.length === 0 || creating}>
                {creating ? 'Creating…' : 'Create →'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Secret reveal dialog */}
      {newSecret && (
        <Dialog open onOpenChange={() => setNewSecret(null)}>
          <DialogContent className="w-[440px] p-0 gap-0">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-text">Webhook created — save your secret</p>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-text-muted">This signing secret is shown <strong>once only</strong>. Use it to verify the <code>X-Stackby-Signature</code> header on incoming requests.</p>
              <div className="flex gap-2">
                <Input value={newSecret} readOnly className="h-8 text-xs font-mono flex-1" />
                <Button size="sm" variant="outline" className="h-8 gap-1.5 shrink-0" onClick={async () => {
                  await navigator.clipboard.writeText(newSecret);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}>
                  {copiedSecret ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedSecret ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Button size="sm" className="w-full" onClick={() => setNewSecret(null)}>I've saved it →</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Deliveries dialog */}
      {deliveriesFor && (
        <Dialog open onOpenChange={() => { setDeliveriesFor(null); setDeliveries([]); }}>
          <DialogContent className="w-[520px] p-0 gap-0">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-text">Recent deliveries</p>
            </div>
            <div className="p-5">
              {loadingDeliveries ? (
                <div className="flex h-24 items-center justify-center"><Spinner /></div>
              ) : deliveries.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-6">No deliveries yet.</p>
              ) : (
                <div className="space-y-px rounded-[8px] border border-border overflow-hidden">
                  {deliveries.map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-surface px-3 py-2 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Circle className={`h-2 w-2 shrink-0 ${d.success ? 'fill-success text-success' : 'fill-destructive text-destructive'}`} />
                        <span className="text-xs font-mono text-text-muted truncate">{d.event}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-text-faint">
                        {d.responseStatus && <span>{d.responseStatus}</span>}
                        {d.durationMs && <span>{d.durationMs}ms</span>}
                        <span>{new Date(d.deliveredAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="rounded-[10px] border border-border bg-surface p-4 space-y-1.5">
        <p className="text-xs font-medium text-text-muted">Verifying webhook signatures</p>
        <p className="text-xs text-text-faint">Each delivery includes a <code>X-Stackby-Signature: sha256=&lt;hex&gt;</code> header. Verify it with:</p>
        <pre className="text-[11px] text-text bg-bg rounded-[6px] p-2 overflow-x-auto">{`const sig = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
if (sig !== req.headers['x-stackby-signature']) throw new Error('Invalid signature');`}</pre>
        <div className="flex gap-3 mt-2">
          <a href="https://docs.studio.stackby.com/api-reference#webhooks" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
            Docs <ExternalLink className="h-3 w-3" />
          </a>
          <a href="https://zapier.com/apps/stackby-studio" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
            Zapier integration <ExternalLink className="h-3 w-3" />
          </a>
          <a href="https://make.com/en/integrations/stackby-studio" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
            Make integration <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
