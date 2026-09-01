'use client';
import { useState } from 'react';
import { Settings, User, X } from 'lucide-react';
import { Dialog, DialogContent, Button, Separator } from '@stackby/ui';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type SettingsTab = 'general' | 'account';

const MODELS = [
  { id: 't3', label: 'Opus (T3 — most capable)' },
  { id: 't2', label: 'Sonnet (T2 — balanced)' },
  { id: 't1', label: 'Standard (T1)' },
  { id: 't0', label: 'Nano (T0 — fastest)' },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('general');
  const [model, setModel] = useState('t2');
  const [skipPlanning, setSkipPlanning] = useState(false);
  const [notificationSounds, setNotificationSounds] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 bg-bg-elevated">
        <div className="flex h-[480px] relative">
          <div className="w-48 shrink-0 border-r border-border bg-bg-muted p-3 flex flex-col gap-1">
            <button
              onClick={() => setTab('general')}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left ${tab === 'general' ? 'bg-bg text-text' : 'text-text-muted hover:bg-bg hover:text-text'}`}
            >
              <Settings className="h-4 w-4" /> General
            </button>
            <button
              onClick={() => setTab('account')}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left ${tab === 'account' ? 'bg-bg text-text' : 'text-text-muted hover:bg-bg hover:text-text'}`}
            >
              <User className="h-4 w-4" /> Account
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {tab === 'general' ? (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-text">General</h2>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-text">Model</p>
                  {MODELS.map((m) => (
                    <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="model"
                        value={m.id}
                        checked={model === m.id}
                        onChange={() => setModel(m.id)}
                        className="accent-accent"
                      />
                      <span className="text-sm text-text">{m.label}</span>
                    </label>
                  ))}
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-text">Planning</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipPlanning}
                      onChange={(e) => setSkipPlanning(e.target.checked)}
                      className="accent-accent"
                    />
                    <span className="text-sm text-text">Skip planning phase</span>
                  </label>
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-text">Notifications</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text">Play notification sounds</span>
                    <button
                      role="switch"
                      aria-checked={notificationSounds}
                      onClick={() => setNotificationSounds(!notificationSounds)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${notificationSounds ? 'bg-accent' : 'bg-bg-muted'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${notificationSounds ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-text">Account</h2>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text">Profile</p>
                  <p className="text-sm text-text-muted">dev@stackby.com</p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-text">Stackby Connection</p>
                  <p className="text-sm text-text-muted">Revoke Stackby API access. You can reconnect at any time.</p>
                  <Button variant="outline" size="sm">Disconnect Stackby</Button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full h-7 w-7 flex items-center justify-center text-text-muted hover:text-text hover:bg-bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
