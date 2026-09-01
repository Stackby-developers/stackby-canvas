'use client';

import {
  Sparkles,
  Database,
  HelpCircle,
  ClipboardList,
  CheckCircle2,
  Code2,
  Hammer,
  ScanEye,
  Wrench,
  Rocket,
  AlertCircle,
} from 'lucide-react';
import { Progress } from '@stackby/ui';
import type { RunEvent } from '@/src/hooks/use-run-events';

type LucideIcon = React.ComponentType<{ className?: string | undefined }>;

const EVENT_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  intent: { icon: Sparkles, label: 'Intent analyzed' },
  schema_analyzed: { icon: Database, label: 'Schema analyzed' },
  clarification: { icon: HelpCircle, label: 'Clarification needed' },
  plan: { icon: ClipboardList, label: 'Plan ready' },
  plan_approved: { icon: CheckCircle2, label: 'Plan approved' },
  codegen: { icon: Code2, label: 'Generating code' },
  build_progress: { icon: Hammer, label: 'Building' },
  verify: { icon: ScanEye, label: 'Verifying' },
  fix: { icon: Wrench, label: 'Fixing' },
  ready: { icon: Rocket, label: 'Ready' },
  error: { icon: AlertCircle, label: 'Error' },
};

function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function EventDetail({ event }: { event: RunEvent }) {
  switch (event.type) {
    case 'intent': {
      const intent = event.data['intent'];
      return typeof intent === 'string' ? (
        <p className="text-xs text-text-muted">{intent}</p>
      ) : null;
    }
    case 'schema_analyzed': {
      const t = event.data['tableCount'];
      const c = event.data['columnCount'];
      return (
        <p className="text-xs text-text-muted">
          {typeof t === 'number' ? t : '?'} tables · {typeof c === 'number' ? c : '?'} columns
        </p>
      );
    }
    case 'build_progress': {
      const progress = typeof event.data['progress'] === 'number' ? event.data['progress'] : 0;
      return (
        <div className="mt-1 flex items-center gap-2">
          <Progress value={progress} className="h-1 flex-1" />
          <span className="text-xs tabular-nums text-text-faint">{progress}%</span>
        </div>
      );
    }
    case 'codegen': {
      const step = event.data['step'];
      return typeof step === 'string' ? (
        <p className="text-xs text-text-muted font-mono">{step}</p>
      ) : null;
    }
    case 'verify': {
      const pass = event.data['pass'];
      const issues = event.data['issues'];
      return (
        <div className="space-y-1">
          <p className={`text-xs font-medium ${pass ? 'text-success' : 'text-destructive'}`}>
            {pass ? '✓ Passed' : '✗ Issues found'}
          </p>
          {Array.isArray(issues) &&
            issues.map((issue, i) => (
              <p key={i} className="text-xs text-text-muted pl-3 border-l border-destructive/40">
                {String(issue)}
              </p>
            ))}
        </div>
      );
    }
    case 'fix': {
      const issue = event.data['issue'];
      const attempt = event.data['attempt'];
      return (
        <p className="text-xs text-text-muted">
          Attempt {typeof attempt === 'number' ? attempt : '?'} — {typeof issue === 'string' ? issue : ''}
        </p>
      );
    }
    case 'ready':
      return <p className="text-xs font-medium text-success">Preview ready</p>;
    case 'error': {
      const code = event.data['code'];
      const message = event.data['message'];
      return (
        <p className="text-xs text-destructive">
          {typeof code === 'string' ? code : 'ERROR'}
          {typeof message === 'string' ? ` — ${message}` : ''}
        </p>
      );
    }
    default:
      return null;
  }
}

interface RunCardProps {
  event: RunEvent;
  isLatest: boolean;
}

export function RunCard({ event, isLatest }: RunCardProps) {
  const config = EVENT_CONFIG[event.type] ?? { icon: Sparkles, label: event.type };
  const Icon = config.icon;

  return (
    <div className="flex gap-3 py-2 px-3">
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isLatest ? 'bg-accent/15 text-accent' : 'bg-bg-muted text-text-faint'
        }`}
      >
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-text">{config.label}</p>
          <span className="shrink-0 text-[10px] tabular-nums text-text-faint">
            {formatTs(event.ts)}
          </span>
        </div>
        <EventDetail event={event} />
      </div>
    </div>
  );
}
