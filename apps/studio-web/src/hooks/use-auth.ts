'use client';
import { useEffect, useState, useCallback } from 'react';

export interface StackbyStack {
  id: string;
  name: string;
}

export interface AuthState {
  pat: string | null;
  stacks: StackbyStack[];
  isConnected: boolean;
  loading: boolean;
}

const PAT_KEY = 'stackby_pat';
const STACKS_KEY = 'stackby_stacks';

export function useAuth(): AuthState & {
  connect: (pat: string) => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => void;
} {
  const [state, setState] = useState<AuthState>({
    pat: null,
    stacks: [],
    isConnected: false,
    loading: true,
  });

  useEffect(() => {
    const storedPat = localStorage.getItem(PAT_KEY);
    const storedStacks = localStorage.getItem(STACKS_KEY);
    if (storedPat) {
      let stacks: StackbyStack[] = [];
      try {
        stacks = storedStacks ? (JSON.parse(storedStacks) as StackbyStack[]) : [];
      } catch {
        stacks = [];
      }
      setState({ pat: storedPat, stacks, isConnected: true, loading: false });
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const connect = useCallback(async (pat: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/auth/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pat }),
    });
    const data = (await res.json()) as { connected?: boolean; stacks?: StackbyStack[]; error?: string };
    if (!res.ok || !data.connected) {
      return { ok: false, error: data.error ?? 'Connection failed. Check your PAT.' };
    }
    const stacks = data.stacks ?? [];
    localStorage.setItem(PAT_KEY, pat);
    localStorage.setItem(STACKS_KEY, JSON.stringify(stacks));
    setState({ pat, stacks, isConnected: true, loading: false });
    return { ok: true };
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(PAT_KEY);
    localStorage.removeItem(STACKS_KEY);
    setState({ pat: null, stacks: [], isConnected: false, loading: false });
  }, []);

  return { ...state, connect, disconnect };
}
