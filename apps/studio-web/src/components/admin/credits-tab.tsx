'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Progress, Spinner } from '@stackby/ui';

interface UsageDay {
  period: string;
  credits: string;
}

interface CreditBalance {
  workspaceId: string;
  balance: number;
  totalDebited: number;
  totalCredited: number;
}

type Period = 'day' | 'week' | 'month';

export function CreditsTab() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [usage, setUsage] = useState<UsageDay[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      fetch('/api/credits/balance?workspaceId=dev-workspace').then((r) => r.json() as Promise<CreditBalance>),
      fetch(`/api/admin/usage?workspaceId=dev-workspace&period=${period}&groupBy=day`).then(
        (r) => r.json() as Promise<{ usage: UsageDay[] }>,
      ),
    ])
      .then(([bal, usageRes]) => {
        setBalance(bal);
        setUsage(usageRes.usage ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const maxCredits = Math.max(...usage.map((u) => Number(u.credits)), 1);
  const used = balance ? balance.totalCredited - balance.balance : 0;
  const progressValue = balance && balance.totalCredited > 0 ? (used / balance.totalCredited) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-muted">Credit Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {balance ? (
              <>
                <p className="text-3xl font-bold tabular-nums text-text">
                  {balance.balance.toLocaleString()}
                </p>
                <Progress value={progressValue} className="h-1.5" />
                <div className="flex justify-between text-xs">
                  <span className="text-destructive">Used: {used.toLocaleString()}</span>
                  <span className="text-success">Added: {balance.totalCredited.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-faint">No balance data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-muted">Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === p
                      ? 'bg-accent text-accent-fg'
                      : 'bg-bg-muted text-text-muted hover:bg-bg-muted/80'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-muted">Credits used by day</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-faint">
              No credit usage data for this period.
            </p>
          ) : (
            <div className="flex h-28 items-end gap-1 overflow-hidden">
              {usage.slice(-14).map((u) => (
                <div key={u.period} className="flex flex-1 flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t-sm bg-accent/70"
                    style={{ height: `${(Number(u.credits) / maxCredits) * 88}px` }}
                  />
                  <span className="origin-top-left rotate-45 text-[9px] text-text-faint">
                    {u.period.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
