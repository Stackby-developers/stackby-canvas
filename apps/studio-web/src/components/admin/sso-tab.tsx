'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Textarea } from '@stackby/ui';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';

interface SsoForm {
  entityId: string;
  entryPoint: string;
  idpCert: string;
  workspacePat: string;
  emailAttr: string;
  userIdAttr: string;
}

const EMPTY: SsoForm = {
  entityId: 'https://studio.stackby.com',
  entryPoint: '',
  idpCert: '',
  workspacePat: '',
  emailAttr: 'email',
  userIdAttr: 'uid',
};

export function SsoTab() {
  const [form, setForm] = useState<SsoForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'saved' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const set = (field: keyof SsoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setResult(null);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.entryPoint || !form.idpCert || !form.workspacePat) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/saml/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: DEV_WORKSPACE_ID,
          issuer: form.entityId,
          entryPoint: form.entryPoint,
          idpCert: form.idpCert,
          workspacePat: form.workspacePat,
          attributeMapping: { email: form.emailAttr, userId: form.userIdAttr },
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Save failed');
      }
      setResult('saved');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
      setResult('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-2">
        <Shield size={18} strokeWidth={1.6} className="text-text-muted" />
        <div>
          <h2 className="text-sm font-semibold text-text">SAML 2.0 Single Sign-On</h2>
          <p className="text-xs text-text-muted">Enterprise plan — configure your IdP to let workspace members sign in without a PAT.</p>
        </div>
      </div>

      <form onSubmit={(e) => void save(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text">SP Entity ID / Issuer</label>
          <Input value={form.entityId} onChange={set('entityId')} placeholder="https://studio.stackby.com" />
          <p className="mt-1 text-xs text-text-muted">The audience URI configured in your IdP for this service provider.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text">IdP SSO URL</label>
          <Input value={form.entryPoint} onChange={set('entryPoint')} placeholder="https://your-idp.com/sso/saml" required />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text">IdP Certificate (PEM)</label>
          <Textarea
            value={form.idpCert}
            onChange={set('idpCert')}
            placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
            rows={5}
            className="font-mono text-xs"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text">Workspace Stackby PAT</label>
          <Input
            type="password"
            value={form.workspacePat}
            onChange={set('workspacePat')}
            placeholder="pat_xxxxxxxxxxxxxxxxxx"
            required
          />
          <p className="mt-1 text-xs text-text-muted">
            A service-level PAT with <code>data.records:read</code> and <code>schema.bases:read</code> scopes.
            SSO users share this credential for Stackby data access.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text">Email attribute</label>
            <Input value={form.emailAttr} onChange={set('emailAttr')} placeholder="email" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text">User ID attribute</label>
            <Input value={form.userIdAttr} onChange={set('userIdAttr')} placeholder="uid" />
          </div>
        </div>

        {result === 'saved' && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle size={13} /> SAML configuration saved. Users can now sign in at{' '}
            <code className="font-mono">/connect</code> with your workspace SSO ID.
          </div>
        )}
        {result === 'error' && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle size={13} /> {errorMsg}
          </div>
        )}

        <Button type="submit" disabled={saving || !form.entryPoint || !form.idpCert || !form.workspacePat} size="sm">
          {saving ? 'Saving…' : 'Save SSO config'}
        </Button>
      </form>

      <div className="rounded-md border border-border bg-surface p-4 text-xs text-text-muted space-y-1">
        <p className="font-medium text-text">ACS URL to register with your IdP</p>
        <code className="block font-mono text-xs">
          {typeof window !== 'undefined' ? window.location.origin : 'https://studio.stackby.com'}
          /api/auth/saml/{DEV_WORKSPACE_ID.slice(-8)}/callback
        </code>
        <p className="pt-1">Users sign in at <code>/connect</code> and enter their Workspace SSO ID.</p>
      </div>
    </div>
  );
}
