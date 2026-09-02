'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Database, RotateCcw, Monitor, Code2, MessageSquare } from 'lucide-react';
import { useRunEvents } from '@/src/hooks/use-run-events';
import { RunFeed } from './run-feed';
import { PreviewHost } from './preview-host';
import { FollowUpBar } from './follow-up-bar';
import { PropertiesRail } from './properties-rail';
import { PublishPopover } from './publish-popover';
import { Logo } from '@/src/components/layout/logo';

interface PlanStep {
  id: string;
  type: string;
  title: string;
  tables: string[];
  columns: string[];
}

interface Plan {
  id: string;
  runId: string;
  intent: string;
  artifactType: string;
  stackId: string;
  steps: PlanStep[];
}

type BuilderView = 'preview' | 'code';

interface BuilderShellProps {
  projectId: string;
  runId: string | null;
}

export function BuilderShell({ projectId, runId }: BuilderShellProps) {
  const { events, phase, sendSignal } = useRunEvents(runId);
  const [view, setView] = useState<BuilderView>('preview');
  const [showRail, setShowRail] = useState(false);

  const planEvent = [...events].reverse().find((e) => e.type === 'plan');
  const plan = planEvent ? (planEvent.data as unknown as Plan) : null;
  const stackId = plan?.stackId ?? '';

  function handleFollowUp(p: string) {
    console.warn('Follow-up not yet implemented:', p);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: '#1C1C1C' }}
    >
      {/* Canvas-style top header */}
      <header
        className="flex h-[70px] shrink-0 items-center gap-2 border-b border-border px-3"
        style={{ background: '#1C1C1C' }}
      >
        {/* Left */}
        <Link href="/" style={{ display: 'inline-flex', marginRight: '4px' }}>
          <Logo size={22} />
        </Link>

        <button className="flex max-w-[200px] items-center gap-1 rounded-[8px] px-2 py-1 text-[16px] font-medium text-text hover:bg-surface transition-colors duration-150">
          <span className="truncate">Project</span>
          <ChevronDown strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        </button>

        <span className="rounded-[6px] border border-border px-1.5 py-0.5 text-[13px] text-text-muted">
          App
        </span>

        <button
          onClick={() => setShowRail((o) => !o)}
          className="rounded-[6px] p-1.5 text-text-muted hover:bg-surface hover:text-text transition-colors duration-150"
          title="Toggle properties panel"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        {/* Center: base pill */}
        <div className="flex flex-1 justify-center">
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '40px', padding: '0 14px', borderRadius: '10px', background: '#232323', border: '1px solid #3A3A3A', fontSize: '15px' }}>
            <Database strokeWidth={1.6} style={{ width: '16px', height: '16px', color: '#8A8A8A', flexShrink: 0 }} />
            {/* Online dot */}
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3ECF8E', boxShadow: '0 0 0 2px #232323', display: 'inline-block' }} />
            </span>
            <span style={{ color: '#fff', fontSize: '15px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stackId || 'Select a base'}
            </span>
            <button style={{ color: '#8A8A8A', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}>
              <RotateCcw strokeWidth={1.6} style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        </div>

        {/* Right: mode buttons (individual, no outer group border) + Publish */}
        <div className="flex items-center gap-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {([
              { id: 'preview', Icon: Monitor, label: 'Preview', extra: true },
              { id: 'code', Icon: Code2, label: 'Edit', extra: false },
              { id: 'annotate', Icon: MessageSquare, label: 'Annotate', extra: false },
            ] as const).map(({ id, Icon, label, extra }) => (
              <button
                key={id}
                onClick={() => setView(id === 'annotate' ? 'preview' : (id as BuilderView))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  height: '38px', padding: '0 12px', borderRadius: '8px',
                  fontSize: '15px',
                  border: `1px solid ${view === id ? '#3A3A3A' : 'transparent'}`,
                  background: view === id ? '#282828' : 'transparent',
                  color: view === id ? '#fff' : '#EDEDED',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon strokeWidth={1.6} style={{ width: '16px', height: '16px' }} />
                {label}
                {extra && <ChevronDown strokeWidth={1.6} style={{ width: '12px', height: '12px' }} />}
              </button>
            ))}
          </div>

          {/* Publish button: white bg, black text */}
          <div style={{ position: 'relative' }}>
            <PublishPopover
              projectId={projectId}
              runId={runId}
              plan={plan}
              isReady={phase === 'complete'}
            />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: conversation — 500px per reference */}
        <div
          style={{ width: '500px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1C1C1C' }}
        >
          <RunFeed events={events} phase={phase} sendSignal={sendSignal} />
          <FollowUpBar phase={phase} onSubmit={handleFollowUp} />
        </div>

        {/* Center: preview canvas — #241f1d warm dark, inset 0 12px 12px 0 */}
        <div className="flex-1 overflow-hidden" style={{ padding: '0 12px 12px 0' }}>
          <div style={{ height: '100%', border: '1px solid #2E2E2E', borderRadius: '12px', background: '#241f1d', overflow: 'hidden' }}>
            <PreviewHost events={events} phase={phase} />
          </div>
        </div>

        {/* Right rail (toggle) */}
        {showRail && (
          <PropertiesRail projectId={projectId} runId={runId} events={events} phase={phase} />
        )}
      </div>
    </div>
  );
}
