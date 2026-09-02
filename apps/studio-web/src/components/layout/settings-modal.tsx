'use client';
import { useState } from 'react';
import { X, Settings, User } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Tab = 'general' | 'account';

const MODELS = [
  { id: 'opus46', label: 'Opus 4.6' },
  { id: 'opus45', label: 'Opus 4.5' },
  { id: 'sonnet45', label: 'Sonnet 4.5' },
  { id: 'haiku45', label: 'Haiku 4.5' },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('general');
  const [model, setModel] = useState('opus46');
  const [skipPlanning, setSkipPlanning] = useState(false);
  const [sounds, setSounds] = useState(true);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div
        className="relative flex h-[480px] w-[560px] overflow-hidden rounded-[14px] border border-border"
        style={{ background: '#1C1C1C', boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}
      >
        {/* Left nav */}
        <div
          className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border p-3"
          style={{ background: '#202020' }}
        >
          {([['general', Settings, 'General'], ['account', User, 'Account']] as const).map(([t, Icon, label]) => (
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
          {tab === 'general' ? (
            <>
              <h2 className="text-[16px] font-semibold text-text">General</h2>

              <div className="space-y-3">
                <p className="text-[15px] font-medium text-text">Model</p>
                {MODELS.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="model"
                      value={m.id}
                      checked={model === m.id}
                      onChange={() => setModel(m.id)}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="text-[15px] text-text">{m.label}</span>
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
                <p className="mb-3 text-[15px] text-text-muted">
                  Revoke Stackby API access. You can reconnect at any time.
                </p>
                <button className="rounded-[8px] border border-border-active bg-surface px-3 py-2 text-[15px] text-text hover:bg-hover transition-colors duration-150">
                  Disconnect Stackby
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-muted hover:text-text transition-colors duration-150"
        >
          <X strokeWidth={1.5} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
