'use client';
import { useState, useEffect } from 'react';
import { X, Settings, User, Zap, ExternalLink } from 'lucide-react';
import { useAuth } from '@/src/hooks/use-auth';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Tab = 'general' | 'account' | 'credits';

interface CreditBalance {
  balance: number;
  totalDebited: number;
  totalCredited: number;
}

interface LedgerEntry {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
}

function CreditsPanel() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch(`/api/credits/balance?workspaceId=${DEV_WORKSPACE_ID}`).then((r) => r.json() as Promise<CreditBalance>),
      fetch(`/api/credits/history?workspaceId=${DEV_WORKSPACE_ID}&limit=10`).then((r) => r.json() as Promise<{ entries: LedgerEntry[] }>),
    ])
      .then(([bal, hist]) => {
        setBalance(bal);
        setHistory(hist.entries ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const used = balance ? balance.totalCredited - balance.balance : 0;
  const pct = balance && balance.totalCredited > 0 ? Math.round((used / balance.totalCredited) * 100) : 0;

  return (
    <div className="space-y-5">
      <h2 className="text-[16px] font-semibold text-text">Credits</h2>

      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #3A3A3A', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          {/* Balance card */}
          <div className="rounded-[10px] border border-border bg-surface p-4 space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[13px] text-text-muted mb-0.5">Available balance</p>
                <p className="text-3xl font-bold tabular-nums text-text">
                  {(balance?.balance ?? 0).toLocaleString()}
                </p>
              </div>
              <span className="text-[12px] text-text-faint">{pct}% used</span>
            </div>
            {/* progress bar */}
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(pct, 100)}%`, transition: 'width 400ms ease' }}
              />
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-text-faint">Used: {used.toLocaleString()}</span>
              <span className="text-text-faint">Granted: {(balance?.totalCredited ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Add credits CTA */}
          <a
            href="https://stackby.com/studio/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full rounded-[10px] border border-border bg-surface px-4 py-3 hover:bg-hover transition-colors duration-150"
          >
            <div className="flex items-center gap-2.5">
              <Zap strokeWidth={1.5} className="h-4 w-4 text-accent shrink-0" />
              <div>
                <p className="text-[14px] font-medium text-text">Add credits</p>
                <p className="text-[12px] text-text-muted">Purchase a credit pack or upgrade your plan</p>
              </div>
            </div>
            <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5 text-text-faint shrink-0" />
          </a>

          {/* Recent transactions */}
          {history.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-text-muted">Recent transactions</p>
              <div className="space-y-px rounded-[8px] border border-border overflow-hidden">
                {history.map((e) => (
                  <div key={e.id} className="flex items-center justify-between bg-surface px-3 py-2">
                    <span className="text-[13px] text-text truncate mr-3">{e.description}</span>
                    <span className={['text-[13px] font-medium tabular-nums shrink-0', e.amount < 0 ? 'text-destructive' : 'text-success'].join(' ')}>
                      {e.amount > 0 ? '+' : ''}{e.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const MODELS = [
  { id: 'opus46',   label: 'Opus 4.6',   tier: 'T3', description: 'Most capable — best for complex apps' },
  { id: 'opus45',   label: 'Opus 4.5',   tier: 'T3', description: 'Previous Opus — reliable and thorough' },
  { id: 'sonnet45', label: 'Sonnet 4.5', tier: 'T2', description: 'Balanced speed and quality' },
  { id: 'haiku45',  label: 'Haiku 4.5',  tier: 'T0', description: 'Fastest — good for simple apps' },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('general');
  const { isConnected, stacks, disconnect } = useAuth();
  const [model, setModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('studio_model_pref') ?? 'opus46';
    }
    return 'opus46';
  });
  const [skipPlanning, setSkipPlanning] = useState(false);
  const [sounds, setSounds] = useState(true);

  function handleModelChange(id: string) {
    setModel(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('studio_model_pref', id);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative flex h-[520px] w-[580px] overflow-hidden rounded-[14px] border border-border"
        style={{ background: '#1C1C1C', boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}
      >
        {/* Left nav */}
        <div
          className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border p-3"
          style={{ background: '#202020' }}
        >
          {([['general', Settings, 'General'], ['account', User, 'Account'], ['credits', Zap, 'Credits']] as const).map(([t, Icon, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-[15px] transition-colors duration-150',
                tab === t
                  ? 'bg-surface text-text'
                  : 'text-text-muted hover:bg-hover hover:text-text-secondary',
              ].join(' ')}
            >
              <Icon strokeWidth={1.5} className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {tab === 'credits' ? (
            <CreditsPanel />
          ) : tab === 'general' ? (
            <>
              <h2 id="settings-modal-title" className="text-[16px] font-semibold text-text">General</h2>

              <div className="space-y-1">
                <p className="text-[15px] font-medium text-text mb-3">Model</p>
                {MODELS.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-3 py-1.5 rounded-[8px] px-2 hover:bg-hover transition-colors duration-150">
                    <input
                      type="radio"
                      name="model"
                      value={m.id}
                      checked={model === m.id}
                      onChange={() => handleModelChange(m.id)}
                      className="h-4 w-4 accent-accent mt-0.5 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] text-text">{m.label}</span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                          style={{ background: 'hsl(var(--color-bg-muted))', color: 'hsl(var(--color-text-muted))' }}
                        >
                          {m.tier}
                        </span>
                      </div>
                      <p className="text-[13px] text-text-faint">{m.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <p className="text-[15px] font-medium text-text">Planning</p>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={skipPlanning}
                    onChange={(e) => setSkipPlanning(e.target.checked)}
                    className="h-4 w-4 rounded accent-accent"
                  />
                  <span className="text-[15px] text-text">Skip planning phase</span>
                </label>
              </div>

              <div className="h-px bg-border" />

              <div>
                <p className="mb-3 text-[15px] font-medium text-text">Notifications</p>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] text-text">Play notification sounds</span>
                  <button
                    role="switch"
                    aria-checked={sounds}
                    onClick={() => setSounds(!sounds)}
                    className={[
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150',
                      sounds ? 'bg-accent' : 'bg-border-active',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150',
                        sounds ? 'translate-x-4' : 'translate-x-0',
                      ].join(' ')}
                    />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[16px] font-semibold text-text">Account</h2>
              <div>
                <p className="mb-2 text-[15px] font-medium text-text">Profile</p>
                <p className="text-[15px] text-text-muted">dev@stackby.com</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="mb-2 text-[15px] font-medium text-text">Stackby Connection</p>
                {isConnected ? (
                  <div className="space-y-2">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3ECF8E', flexShrink: 0 }} />
                      <p className="text-[15px] text-text-muted">Connected</p>
                    </div>
                    <p className="text-[13px] text-text-faint">
                      {stacks.length} stack{stacks.length !== 1 ? 's' : ''} available
                    </p>
                    <button
                      onClick={() => { disconnect(); onOpenChange(false); }}
                      className="mt-1 rounded-[8px] border border-border-active bg-surface px-3 py-2 text-[15px] text-text hover:bg-hover transition-colors duration-150"
                    >
                      Disconnect Stackby
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[15px] text-text-muted">Not connected.</p>
                    <a
                      href="/connect"
                      onClick={() => onOpenChange(false)}
                      className="inline-flex rounded-[8px] px-3 py-2 text-[15px] text-white hover:opacity-90 transition-opacity"
                      style={{ background: '#2D7FF9' }}
                    >
                      Connect Stackby →
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close settings"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-muted hover:text-text transition-colors duration-150"
        >
          <X strokeWidth={1.5} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
