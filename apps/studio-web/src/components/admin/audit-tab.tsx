'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Badge, Button, Input, Spinner } from '@stackby/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@stackby/ui';
import { formatRelativeTime } from '@/src/lib/format';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';

interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
}

export function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ workspaceId: 'DEV_WORKSPACE_ID', limit: '100', offset: '0' });
      if (action) params.set('action', action);
      if (actorId) params.set('actorId', actorId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      fetch(`/api/admin/audit?${params.toString()}`)
        .then((r) => r.json() as Promise<{ entries: AuditEntry[] }>)
        .then(({ entries: e }) => setEntries(e ?? []))
        .catch(() => setEntries([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [action, actorId, dateFrom, dateTo]);

  function handleExportCsv() {
    const params = new URLSearchParams({
      workspaceId: 'DEV_WORKSPACE_ID',
      format: 'csv',
      limit: '1000',
      offset: '0',
    });
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
    window.open(`${apiUrl}/v1/admin/audit?${params.toString()}`, '_blank');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter by action…"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-8 w-44 text-xs"
        />
        <Input
          placeholder="Filter by actor ID…"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          className="h-8 w-44 text-xs"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 rounded-md border border-border bg-transparent px-2 text-xs text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label="Date from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-8 rounded-md border border-border bg-transparent px-2 text-xs text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label="Date to"
        />
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="ml-auto h-8 gap-1.5">
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-faint">
          No audit log entries found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-bg-muted">
                <th className="px-4 py-2 text-left font-semibold text-text-muted">Time</th>
                <th className="px-4 py-2 text-left font-semibold text-text-muted">Actor</th>
                <th className="px-4 py-2 text-left font-semibold text-text-muted">Action</th>
                <th className="px-4 py-2 text-left font-semibold text-text-muted">Resource Type</th>
                <th className="px-4 py-2 text-left font-semibold text-text-muted">Resource ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-bg-muted/50">
                  <td className="px-4 py-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default text-text-muted">
                          {formatRelativeTime(e.createdAt)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{e.createdAt}</TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-1.5 font-mono text-text-muted">{e.actorId}</td>
                  <td className="px-4 py-1.5">
                    <code className="rounded bg-bg-muted px-1 font-mono text-text">{e.action}</code>
                  </td>
                  <td className="px-4 py-1.5">
                    <Badge variant="outline">{e.resourceType}</Badge>
                  </td>
                  <td className="px-4 py-1.5 font-mono text-text-faint">
                    {e.resourceId.slice(0, 8)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
